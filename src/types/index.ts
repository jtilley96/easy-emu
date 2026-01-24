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
