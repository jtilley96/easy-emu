export interface Game {
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
  addedAt?: string
  isFavorite?: boolean
  preferredEmulator?: string
}

export interface EmulatorInfo {
  id: string
  name: string
  path: string | null
  platforms: string[]
  installed: boolean
  enabled: boolean
  canInstall: boolean
  downloadUrl: string | null
}

export interface BiosFile {
  id: string
  name: string
  platform: string
  required: boolean
  path: string | null
  status: 'found' | 'missing' | 'invalid'
  expectedHash?: string
}

export interface Platform {
  id: string
  name: string
  shortName: string
  icon: string
  extensions: string[]
  emulators: string[]
}

export interface AppConfig {
  romFolders: string[]
  emulatorPaths: Record<string, string>
  biosPaths: Record<string, string>
  savesPath: string
  statesPath: string
  screenshotsPath: string
  coversPath: string
  autoScrape: boolean
  startMinimized: boolean
  checkUpdates: boolean
}

export interface ScanProgress {
  total: number
  scanned: number
  current: string
}

export interface ScrapeResult {
  gameId: string
  success: boolean
  error?: string
  matched: boolean
  title?: string
}

export interface ScrapeProgress {
  current: number
  total: number
  currentGame: string
  gameId: string
}

// Embedded Emulator Types
export interface InstalledCore {
  id: string
  name: string
  platforms: string[]
  coreName: string
  dataPath: string
  installedAt: string
  version: string
}

export interface AvailableCore {
  id: string
  name: string
  platforms: string[]
  coreName: string
  size: number
  installed: boolean
}

export interface CoreDownloadProgress {
  coreId: string
  status: 'downloading' | 'verifying' | 'complete' | 'error'
  progress: number
  downloadedBytes: number
  totalBytes: number
  error?: string
}

export interface EmbeddedPlayCapability {
  canPlay: boolean
  reason?: string
  coreName?: string
}

export interface CorePaths {
  dataPath: string
  coreName: string
}

export interface EmbeddedConfig {
  preferEmbedded: boolean
  embeddedShader: string
  embeddedIntegerScaling: boolean
}

export interface SaveStateInfo {
  slot: number
  exists: boolean
  timestamp?: string
  screenshotPath?: string
  size?: number
}
