import { app, ipcMain, BrowserWindow, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import https from 'https'

let mainWindowRef: BrowserWindow | null = null

export function setUpdaterMainWindow(win: BrowserWindow | null): void {
  mainWindowRef = win
}

// GitHub repository configuration
const GITHUB_OWNER = 'jtilley96'
const GITHUB_REPO = 'easy-emu'
const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`

export interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  releaseNotes: string
  releaseUrl: string
  downloadUrl: string
  publishedAt: string
  assetName: string
  assetSize: number
}

export interface UpdateDownloadProgress {
  status: 'idle' | 'checking' | 'downloading' | 'complete' | 'error'
  progress: number
  downloadedBytes: number
  totalBytes: number
  downloadPath?: string
  error?: string
}

interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  html_url: string
  published_at: string
  assets: GitHubAsset[]
}

interface GitHubAsset {
  name: string
  browser_download_url: string
  size: number
}

let currentDownloadPath: string | null = null

function getDownloadsPath(): string {
  return path.join(app.getPath('userData'), 'updates')
}

function ensureDownloadsDirectory(): void {
  const downloadsPath = getDownloadsPath()
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true })
  }
}

/**
 * Parse version string into comparable parts
 * Handles formats like: 1.0.0, v1.0.0, 1.0.0-alpha, 1.0.0-beta.1
 */
function parseVersion(version: string): {
  major: number
  minor: number
  patch: number
  prerelease: string
} {
  const cleaned = version.replace(/^v/, '')
  const [versionPart, prerelease = ''] = cleaned.split('-')
  const [major = 0, minor = 0, patch = 0] = versionPart.split('.').map(Number)
  return { major, minor, patch, prerelease }
}

/**
 * Compare prerelease identifiers following SemVer rules
 * Each identifier is compared numerically if both are numeric, otherwise lexicographically
 */
function comparePrerelease(a: string, b: string): number {
  const partsA = a.split('.')
  const partsB = b.split('.')

  const maxLength = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < maxLength; i++) {
    const partA = partsA[i]
    const partB = partsB[i]

    // If one is missing, the shorter one is less
    if (partA === undefined) return -1
    if (partB === undefined) return 1

    // Try to parse as numbers
    const numA = Number(partA)
    const numB = Number(partB)

    // If both are numeric, compare as numbers
    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA !== numB) return numA - numB
      continue
    }

    // Otherwise compare as strings
    if (partA !== partB) {
      return partA < partB ? -1 : 1
    }
  }

  return 0
}

/**
 * Compare two version strings
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
function compareVersions(a: string, b: string): number {
  const va = parseVersion(a)
  const vb = parseVersion(b)

  // Compare major.minor.patch
  if (va.major !== vb.major) return va.major - vb.major
  if (va.minor !== vb.minor) return va.minor - vb.minor
  if (va.patch !== vb.patch) return va.patch - vb.patch

  // Handle prereleases: no prerelease > any prerelease
  if (!va.prerelease && vb.prerelease) return 1
  if (va.prerelease && !vb.prerelease) return -1
  if (va.prerelease && vb.prerelease) {
    // alpha < beta < rc
    const order = ['alpha', 'beta', 'rc']
    const getOrder = (pre: string) => {
      const base = pre.split('.')[0]
      const idx = order.findIndex(o => base.includes(o))
      return idx >= 0 ? idx : order.length
    }
    const orderA = getOrder(va.prerelease)
    const orderB = getOrder(vb.prerelease)
    if (orderA !== orderB) return orderA - orderB
    // Use proper prerelease comparison for same type
    return comparePrerelease(va.prerelease, vb.prerelease)
  }

  return 0
}

/**
 * Get the appropriate download asset for the current platform
 */
function getPlatformAsset(assets: GitHubAsset[]): GitHubAsset | null {
  const platform = process.platform
  const arch = process.arch

  // Define patterns for each platform
  const patterns: Record<string, RegExp[]> = {
    win32: [
      /EasyEmu.*Setup.*\.exe$/i,
      /EasyEmu.*\.exe$/i
    ],
    darwin: [
      arch === 'arm64' ? /EasyEmu.*arm64.*\.dmg$/i : /EasyEmu(?!.*arm64).*\.dmg$/i,
      /EasyEmu.*\.dmg$/i
    ],
    linux: [
      /EasyEmu.*\.AppImage$/i,
      /EasyEmu.*\.deb$/i
    ]
  }

  const platformPatterns = patterns[platform] || []

  // Try each pattern in order of preference
  for (const pattern of platformPatterns) {
    const asset = assets.find(a => pattern.test(a.name))
    if (asset) return asset
  }

  return null
}

function fetchJSON<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': `EasyEmu/${app.getVersion()}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }

    https.get(url, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          fetchJSON<T>(redirectUrl).then(resolve).catch(reject)
          return
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: Failed to fetch`))
        return
      }

      let data = ''
      response.on('data', (chunk) => { data += chunk })
      response.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (error) {
          reject(new Error('Failed to parse JSON response'))
        }
      })
    }).on('error', reject)
  })
}

function downloadFile(
  url: string,
  destPath: string,
  onProgress: (downloaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': `EasyEmu/${app.getVersion()}`
      }
    }

    https.get(url, options, (response) => {
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
    }).on('error', (err) => {
      reject(err)
    })
  })
}

function sendProgress(progress: UpdateDownloadProgress): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('updater:progress', progress)
  }
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  const currentVersion = app.getVersion()

  sendProgress({
    status: 'checking',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0
  })

  try {
    const releases = await fetchJSON<GitHubRelease[]>(RELEASES_API)

    // No releases found
    if (!releases || releases.length === 0) {
      sendProgress({
        status: 'idle',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0
      })
      return {
        currentVersion,
        latestVersion: currentVersion,
        hasUpdate: false,
        releaseNotes: '',
        releaseUrl: '',
        downloadUrl: '',
        publishedAt: '',
        assetName: '',
        assetSize: 0
      }
    }

    // Get the latest release (first in the array)
    const release = releases[0]
    const latestVersion = release.tag_name.replace(/^v/, '')
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    const asset = getPlatformAsset(release.assets)

    sendProgress({
      status: 'idle',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0
    })

    return {
      currentVersion,
      latestVersion,
      hasUpdate,
      releaseNotes: release.body || '',
      releaseUrl: release.html_url,
      downloadUrl: asset?.browser_download_url || '',
      publishedAt: release.published_at,
      assetName: asset?.name || '',
      assetSize: asset?.size || 0
    }
  } catch (error) {
    sendProgress({
      status: 'error',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      error: (error as Error).message
    })
    throw error
  }
}

export async function downloadUpdate(downloadUrl: string, assetName: string, assetSize: number): Promise<string> {
  ensureDownloadsDirectory()
  // Sanitize filename to prevent path traversal attacks
  // path.basename extracts only the filename, removing any directory components
  const sanitizedFileName = path.basename(assetName)
  const destPath = path.join(getDownloadsPath(), sanitizedFileName)
  currentDownloadPath = destPath

  try {
    sendProgress({
      status: 'downloading',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: assetSize
    })

    await downloadFile(downloadUrl, destPath, (downloaded, total) => {
      const actualTotal = total || assetSize
      const progress = actualTotal > 0 ? Math.floor((downloaded / actualTotal) * 100) : 0
      sendProgress({
        status: 'downloading',
        progress,
        downloadedBytes: downloaded,
        totalBytes: actualTotal
      })
    })

    // Verify file exists and size matches expected
    if (!fs.existsSync(destPath)) {
      throw new Error('Download verification failed: file not found')
    }

    const actualFileSize = fs.statSync(destPath).size
    if (actualFileSize !== assetSize) {
      throw new Error(
        `Download verification failed: file size mismatch. Expected ${assetSize} bytes, got ${actualFileSize} bytes. The download may be incomplete.`
      )
    }

    sendProgress({
      status: 'complete',
      progress: 100,
      downloadedBytes: actualFileSize,
      totalBytes: assetSize,
      downloadPath: destPath
    })

    return destPath
  } catch (error) {
    // Clean up on failure
    try {
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath)
      }
    } catch { /* ignore cleanup errors */ }

    sendProgress({
      status: 'error',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: assetSize,
      error: (error as Error).message
    })

    throw error
  }
}

export function openDownloadFolder(): void {
  if (currentDownloadPath && fs.existsSync(currentDownloadPath)) {
    shell.showItemInFolder(currentDownloadPath)
  } else {
    const downloadsPath = getDownloadsPath()
    if (fs.existsSync(downloadsPath)) {
      shell.openPath(downloadsPath)
    }
  }
}

export async function installUpdate(): Promise<void> {
  if (!currentDownloadPath || !fs.existsSync(currentDownloadPath)) {
    throw new Error('No downloaded update file found')
  }

  const platform = process.platform

  if (platform === 'win32' || platform === 'darwin') {
    // Open the installer/dmg and let the user complete installation
    await shell.openPath(currentDownloadPath)
    // Optionally quit the app to allow installation
    // app.quit()
  } else {
    // On Linux, just show the file in folder
    shell.showItemInFolder(currentDownloadPath)
  }
}

export function getDownloadPath(): string | null {
  return currentDownloadPath
}

// Register IPC handlers
export function registerUpdaterHandlers(): void {
  ipcMain.handle('updater:check', async () => {
    return await checkForUpdates()
  })

  ipcMain.handle('updater:download', async (_event, downloadUrl: string, assetName: string, assetSize: number) => {
    return await downloadUpdate(downloadUrl, assetName, assetSize)
  })

  ipcMain.handle('updater:openDownloadFolder', () => {
    openDownloadFolder()
  })

  ipcMain.handle('updater:installUpdate', async () => {
    await installUpdate()
  })

  ipcMain.handle('updater:getDownloadPath', () => {
    return getDownloadPath()
  })
}
