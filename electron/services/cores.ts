import { app, ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import { getConfigValue, setConfigValue } from './config'

let mainWindowRef: BrowserWindow | null = null

export function setCoresMainWindow(win: BrowserWindow | null): void {
  mainWindowRef = win
}

// EmulatorJS CDN base URL
const EMULATORJS_CDN = 'https://cdn.emulatorjs.org/stable/data/cores'

export interface CoreDefinition {
  id: string
  name: string
  platforms: string[]
  coreName: string // EmulatorJS core name (used for CDN path)
  size: number // Approximate size in bytes
}

export interface InstalledCore {
  id: string
  name: string
  platforms: string[]
  coreName: string
  dataPath: string
  installedAt: string
  version: string
}

export interface DownloadProgress {
  coreId: string
  status: 'downloading' | 'verifying' | 'complete' | 'error'
  progress: number // 0-100
  downloadedBytes: number
  totalBytes: number
  error?: string
}

// Core definitions matching EmulatorJS CDN structure
// File format: {coreName}-wasm.data
const CORE_DEFINITIONS: CoreDefinition[] = [
  {
    id: 'fceumm',
    name: 'FCEUmm (NES)',
    platforms: ['nes'],
    coreName: 'fceumm',
    size: 1_200_000
  },
  {
    id: 'snes9x',
    name: 'Snes9x (SNES)',
    platforms: ['snes'],
    coreName: 'snes9x',
    size: 2_800_000
  },
  {
    id: 'genesis_plus_gx',
    name: 'Genesis Plus GX (Genesis/Mega Drive)',
    platforms: ['genesis', 'megadrive', 'sms', 'gamegear'],
    coreName: 'genesis_plus_gx',
    size: 2_200_000
  },
  {
    id: 'gambatte',
    name: 'Gambatte (GB/GBC)',
    platforms: ['gb', 'gbc'],
    coreName: 'gambatte',
    size: 900_000
  },
  {
    id: 'mgba',
    name: 'mGBA (GBA)',
    platforms: ['gba'],
    coreName: 'mgba',
    size: 1_800_000
  },
  {
    id: 'mupen64plus_next',
    name: 'Mupen64Plus-Next (N64)',
    platforms: ['n64'],
    coreName: 'mupen64plus_next',
    size: 7_500_000
  },
  {
    id: 'melonds',
    name: 'melonDS (NDS)',
    platforms: ['nds'],
    coreName: 'melonds',
    size: 1_100_000
  },
  {
    id: 'pcsx_rearmed',
    name: 'PCSX ReARMed (PlayStation)',
    platforms: ['ps1', 'psx'],
    coreName: 'pcsx_rearmed',
    size: 4_500_000
  }
]

function getCoresPath(): string {
  return path.join(app.getPath('userData'), 'cores')
}

function getInstalledCoresPath(): string {
  return path.join(getCoresPath(), 'installed.json')
}

function ensureCoresDirectory(): void {
  const coresPath = getCoresPath()
  if (!fs.existsSync(coresPath)) {
    fs.mkdirSync(coresPath, { recursive: true })
  }
}

function loadInstalledCores(): InstalledCore[] {
  const filePath = getInstalledCoresPath()
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Failed to load installed cores:', error)
  }
  return []
}

function saveInstalledCores(cores: InstalledCore[]): void {
  ensureCoresDirectory()
  const filePath = getInstalledCoresPath()
  try {
    fs.writeFileSync(filePath, JSON.stringify(cores, null, 2))
  } catch (error) {
    console.error('Failed to save installed cores:', error)
  }
}

export function getInstalledCores(): InstalledCore[] {
  return loadInstalledCores()
}

export function getAvailableCores(): Array<CoreDefinition & { installed: boolean }> {
  const installed = loadInstalledCores()
  const installedIds = new Set(installed.map(c => c.id))

  return CORE_DEFINITIONS.map(def => ({
    ...def,
    installed: installedIds.has(def.id)
  }))
}

export function getCoreForPlatform(platform: string): InstalledCore | null {
  const installed = loadInstalledCores()
  return installed.find(c => c.platforms.includes(platform)) || null
}

export function canPlayWithEmbedded(platform: string): boolean {
  const preferEmbedded = getConfigValue('preferEmbedded') ?? true
  if (!preferEmbedded) return false
  return getCoreForPlatform(platform) !== null
}

function downloadFile(url: string, destPath: string, onProgress: (downloaded: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: Failed to download`))
        return
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10)
      let downloadedBytes = 0

      const dir = path.dirname(destPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      const fileStream = fs.createWriteStream(destPath)

      response.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length
        onProgress(downloadedBytes, totalBytes)
      })

      response.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {}) // Clean up partial download
        reject(err)
      })
    })

    request.on('error', (err) => {
      reject(err)
    })

    request.setTimeout(60000, () => {
      request.destroy()
      reject(new Error('Download timeout'))
    })
  })
}

function calculateSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

function sendDownloadProgress(progress: DownloadProgress): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('cores:downloadProgress', progress)
  }
}

export async function downloadCore(coreId: string): Promise<void> {
  const definition = CORE_DEFINITIONS.find(c => c.id === coreId)
  if (!definition) {
    throw new Error(`Unknown core: ${coreId}`)
  }

  ensureCoresDirectory()
  const coreDir = path.join(getCoresPath(), coreId)

  // Download WASM data file from EmulatorJS CDN
  // Format: https://cdn.emulatorjs.org/stable/data/cores/{coreName}-wasm.data
  const dataUrl = `${EMULATORJS_CDN}/${definition.coreName}-wasm.data`
  const dataPath = path.join(coreDir, `${definition.coreName}-wasm.data`)

  const estimatedTotal = definition.size

  try {
    // Start download
    sendDownloadProgress({
      coreId,
      status: 'downloading',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: estimatedTotal
    })

    await downloadFile(dataUrl, dataPath, (downloaded, total) => {
      const actualTotal = total || estimatedTotal
      sendDownloadProgress({
        coreId,
        status: 'downloading',
        progress: Math.floor((downloaded / actualTotal) * 95),
        downloadedBytes: downloaded,
        totalBytes: actualTotal
      })
    })

    // Verify file exists
    sendDownloadProgress({
      coreId,
      status: 'verifying',
      progress: 95,
      downloadedBytes: estimatedTotal,
      totalBytes: estimatedTotal
    })

    if (!fs.existsSync(dataPath)) {
      throw new Error('Download verification failed: file not found')
    }

    // Add to installed cores
    const installed = loadInstalledCores()
    const existingIndex = installed.findIndex(c => c.id === coreId)

    const installedCore: InstalledCore = {
      id: coreId,
      name: definition.name,
      platforms: definition.platforms,
      coreName: definition.coreName,
      dataPath,
      installedAt: new Date().toISOString(),
      version: 'stable'
    }

    if (existingIndex >= 0) {
      installed[existingIndex] = installedCore
    } else {
      installed.push(installedCore)
    }

    saveInstalledCores(installed)

    sendDownloadProgress({
      coreId,
      status: 'complete',
      progress: 100,
      downloadedBytes: estimatedTotal,
      totalBytes: estimatedTotal
    })

  } catch (error) {
    // Clean up on failure
    try {
      if (fs.existsSync(coreDir)) {
        fs.rmSync(coreDir, { recursive: true, force: true })
      }
    } catch { /* ignore cleanup errors */ }

    sendDownloadProgress({
      coreId,
      status: 'error',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: estimatedTotal,
      error: (error as Error).message
    })

    throw error
  }
}

export async function deleteCore(coreId: string): Promise<void> {
  const coreDir = path.join(getCoresPath(), coreId)

  // Remove core directory
  if (fs.existsSync(coreDir)) {
    fs.rmSync(coreDir, { recursive: true, force: true })
  }

  // Update installed cores list
  const installed = loadInstalledCores()
  const filtered = installed.filter(c => c.id !== coreId)
  saveInstalledCores(filtered)
}

export function getCorePaths(platform: string): { dataPath: string; coreName: string } | null {
  const core = getCoreForPlatform(platform)
  if (!core) return null

  return {
    dataPath: core.dataPath,
    coreName: core.coreName
  }
}

// Register IPC handlers
export function registerCoreHandlers(): void {
  ipcMain.handle('cores:getInstalled', () => {
    return getInstalledCores()
  })

  ipcMain.handle('cores:getAvailable', () => {
    return getAvailableCores()
  })

  ipcMain.handle('cores:download', async (_event, coreId: string) => {
    await downloadCore(coreId)
  })

  ipcMain.handle('cores:delete', async (_event, coreId: string) => {
    await deleteCore(coreId)
  })

  ipcMain.handle('cores:getForPlatform', (_event, platform: string) => {
    return getCoreForPlatform(platform)
  })

  ipcMain.handle('cores:canPlayEmbedded', (_event, platform: string) => {
    return canPlayWithEmbedded(platform)
  })
}
