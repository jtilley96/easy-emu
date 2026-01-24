import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { scrapeGame } from './hasheous'
import { getConfigValue } from './config'

export interface GameRecord {
  id: string
  title: string
  platform: string
  path: string
  coverPath?: string
  backdropPath?: string
  screenshotPaths?: string[]
  description?: string
  developer?: string
  publisher?: string
  releaseDate?: string
  genres?: string[]
  rating?: number
  playTime?: number
  lastPlayed?: string
  addedAt: string
  isFavorite: boolean
  preferredEmulator?: string
}

interface LibraryData {
  games: GameRecord[]
}

let libraryData: LibraryData = { games: [] }

// Platform detection based on file extension
const EXTENSION_PLATFORM_MAP: Record<string, string> = {
  '.nes': 'nes', '.nez': 'nes',
  '.sfc': 'snes', '.smc': 'snes',
  '.n64': 'n64', '.z64': 'n64', '.v64': 'n64',
  '.gb': 'gb',
  '.gbc': 'gbc',
  '.gba': 'gba',
  '.nds': 'nds',
  '.3ds': '3ds', '.cia': '3ds',
  '.md': 'genesis', '.gen': 'genesis', '.smd': 'genesis',
  '.iso': 'unknown',
  '.bin': 'unknown',
  '.cue': 'unknown',
  '.pkg': 'ps3',
  '.pbp': 'psp',
  '.nsp': 'switch', '.xci': 'switch',
  '.gcm': 'gamecube', '.gcz': 'gamecube', '.rvz': 'gamecube',
  '.wbfs': 'wii', '.wia': 'wii',
  '.chd': 'unknown',
  '.cso': 'psp',
  '.gdi': 'dreamcast', '.cdi': 'dreamcast'
}

function getLibraryPath(): string {
  return path.join(app.getPath('userData'), 'library.json')
}

function saveLibrary(): void {
  const libraryPath = getLibraryPath()
  const dir = path.dirname(libraryPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(libraryPath, JSON.stringify(libraryData, null, 2))
}

export function initDatabase(): void {
  const libraryPath = getLibraryPath()

  try {
    if (fs.existsSync(libraryPath)) {
      const data = fs.readFileSync(libraryPath, 'utf-8')
      libraryData = JSON.parse(data)
      // Re-detect platform for games stored as "unknown" (e.g. .iso/.bin without path hints)
      let updated = false
      for (const g of libraryData.games) {
        if (g.platform !== 'unknown') continue
        const detected = detectPlatformFromPath(g.path)
        if (detected !== 'unknown') {
          g.platform = detected
          updated = true
        }
      }
      if (updated) saveLibrary()
    }
  } catch (error) {
    console.error('Failed to load library:', error)
    libraryData = { games: [] }
  }
}

function getTitleFromFilename(filePath: string): string {
  const basename = path.basename(filePath, path.extname(filePath))
  return basename
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim()
}

// Folder/path substring hints for ambiguous extensions (.iso, .bin, .cue, .chd).
// Checked in order; first match wins. Prefer more specific (e.g. ps3) before general (e.g. ps1).
const PLATFORM_HINTS: { platform: string; hints: string[] }[] = [
  { platform: 'ps3', hints: ['ps3', 'playstation 3', 'playstation3', 'rpcs3', 'ps 3', 'ps-3'] },
  { platform: 'ps2', hints: ['ps2', 'playstation 2', 'playstation2'] },
  { platform: 'ps1', hints: ['ps1', 'psx', 'playstation', 'playstation 1'] },
  { platform: 'psp', hints: ['psp', 'playstation portable'] },
  { platform: 'wii', hints: ['wii'] },
  { platform: 'gamecube', hints: ['gamecube', 'gc', 'game cube'] },
  { platform: 'switch', hints: ['switch', 'ns', 'nintendo switch'] },
  { platform: 'saturn', hints: ['saturn', 'sega saturn'] },
  { platform: 'dreamcast', hints: ['dreamcast', 'dc', 'sega dreamcast'] },
  { platform: 'genesis', hints: ['genesis', 'megadrive', 'mega drive', 'sega genesis'] },
  { platform: 'snes', hints: ['snes', 'super nintendo', 'super famicom', 'sfc'] },
  { platform: 'nes', hints: ['nes', 'nintendo entertainment', 'famicom'] },
  { platform: 'n64', hints: ['n64', 'nintendo 64'] },
  { platform: 'arcade', hints: ['arcade', 'mame', 'fbneo'] }
]

function detectPlatformFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const platform = EXTENSION_PLATFORM_MAP[ext]

  if (platform && platform !== 'unknown') {
    return platform
  }

  const lowerPath = filePath.toLowerCase().replace(/\\/g, '/')
  const pathSegments = lowerPath.split('/')
  const filenameNoExt = path.basename(filePath, path.extname(filePath)).toLowerCase()

  // Check: filename (e.g. "Game (PS3).iso"), parent folder, grandparent, then full path.
  const foldersToCheck: string[] = [filenameNoExt]
  if (pathSegments.length >= 2) foldersToCheck.push(pathSegments[pathSegments.length - 2])
  if (pathSegments.length >= 3) foldersToCheck.push(pathSegments[pathSegments.length - 3])
  foldersToCheck.push(lowerPath)

  for (const segment of foldersToCheck) {
    for (const { platform: platformId, hints } of PLATFORM_HINTS) {
      for (const hint of hints) {
        if (segment.includes(hint)) {
          return platformId
        }
      }
    }
  }

  return 'unknown'
}

export async function scanFolders(folders: string[]): Promise<void> {
  const supportedExtensions = new Set(Object.keys(EXTENSION_PLATFORM_MAP))
  const existingPaths = new Set(libraryData.games.map(g => g.path))

  const scanFolder = (folderPath: string): string[] => {
    const files: string[] = []

    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name)

        if (entry.isDirectory()) {
          files.push(...scanFolder(fullPath))
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (supportedExtensions.has(ext)) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan folder ${folderPath}:`, error)
    }

    return files
  }

  const allFiles: string[] = []
  for (const folder of folders) {
    if (fs.existsSync(folder)) {
      allFiles.push(...scanFolder(folder))
    }
  }

  const now = new Date().toISOString()
  const newGameIds: string[] = []

  for (const filePath of allFiles) {
    if (existingPaths.has(filePath)) continue

    const title = getTitleFromFilename(filePath)
    const platform = detectPlatformFromPath(filePath)
    const gameId = uuidv4()

    libraryData.games.push({
      id: gameId,
      title,
      platform,
      path: filePath,
      addedAt: now,
      isFavorite: false,
      playTime: 0
    })

    newGameIds.push(gameId)
  }

  saveLibrary()

  // Auto-scrape metadata for new games if enabled
  const autoScrape = getConfigValue('autoScrape')
  if (autoScrape && newGameIds.length > 0) {
    console.log(`Auto-scraping metadata for ${newGameIds.length} new game(s)...`)
    // Scrape asynchronously to avoid blocking the scan operation
    // Use a small delay between requests to be nice to the API
    for (let i = 0; i < newGameIds.length; i++) {
      const gameId = newGameIds[i]
      try {
        await scrapeGame(gameId)
        // Small delay between requests (except for the last one)
        if (i < newGameIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Failed to auto-scrape game ${gameId}:`, error)
        // Continue with other games even if one fails
      }
    }
    console.log(`Auto-scrape complete for ${newGameIds.length} game(s)`)
  }
}

export function getGames(): GameRecord[] {
  return [...libraryData.games].sort((a, b) => a.title.localeCompare(b.title))
}

export function getGame(id: string): GameRecord | null {
  return libraryData.games.find(g => g.id === id) || null
}

export function updateGame(id: string, data: Partial<GameRecord>): void {
  const index = libraryData.games.findIndex(g => g.id === id)
  if (index !== -1) {
    libraryData.games[index] = { ...libraryData.games[index], ...data }
    saveLibrary()
  }
}

export function deleteGame(id: string): void {
  libraryData.games = libraryData.games.filter(g => g.id !== id)
  saveLibrary()
}

export function registerLibraryHandlers(): void {
  ipcMain.handle('library:scan', async (_event, folders: string[]) => {
    await scanFolders(folders)
  })

  ipcMain.handle('library:getGames', () => {
    return getGames()
  })

  ipcMain.handle('library:getGame', (_event, id: string) => {
    return getGame(id)
  })

  ipcMain.handle('library:updateGame', (_event, id: string, data: Record<string, unknown>) => {
    updateGame(id, data as Partial<GameRecord>)
  })

  ipcMain.handle('library:deleteGame', (_event, id: string) => {
    deleteGame(id)
  })
}
