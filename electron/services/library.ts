import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

export interface GameRecord {
  id: string
  title: string
  platform: string
  path: string
  coverPath?: string
  backdropPath?: string
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

function detectPlatformFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const platform = EXTENSION_PLATFORM_MAP[ext]

  if (platform && platform !== 'unknown') {
    return platform
  }

  const lowerPath = filePath.toLowerCase()
  const platformHints: Record<string, string[]> = {
    'ps1': ['ps1', 'psx', 'playstation'],
    'ps2': ['ps2', 'playstation 2', 'playstation2'],
    'ps3': ['ps3', 'playstation 3', 'playstation3'],
    'psp': ['psp'],
    'gamecube': ['gamecube', 'gc'],
    'wii': ['wii'],
    'switch': ['switch', 'ns'],
    'genesis': ['genesis', 'megadrive', 'mega drive'],
    'saturn': ['saturn'],
    'dreamcast': ['dreamcast', 'dc']
  }

  for (const [platformId, hints] of Object.entries(platformHints)) {
    for (const hint of hints) {
      if (lowerPath.includes(hint)) {
        return platformId
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

  for (const filePath of allFiles) {
    if (existingPaths.has(filePath)) continue

    const title = getTitleFromFilename(filePath)
    const platform = detectPlatformFromPath(filePath)

    libraryData.games.push({
      id: uuidv4(),
      title,
      platform,
      path: filePath,
      addedAt: now,
      isFavorite: false,
      playTime: 0
    })
  }

  saveLibrary()
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
