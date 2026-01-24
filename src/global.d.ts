// Global type declarations for the Electron API
// This mirrors the types from electron/preload.ts for the renderer process

declare global {
  interface Game {
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
  }

  interface EmulatorInfo {
    id: string
    name: string
    path: string | null
    platforms: string[]
    installed: boolean
    enabled: boolean
    canInstall: boolean
    downloadUrl: string | null
  }

  interface GameMetadata {
    title: string
    description?: string
    releaseDate?: string
    developer?: string
    publisher?: string
    genre?: string[]
    rating?: number
    coverUrl?: string
    screenshotUrls?: string[]
  }

  interface BiosDefinition {
    id: string
    name: string
    description: string
    platform: string
    required: boolean
    filenames: string[]
  }

  interface BiosStatus {
    id: string
    name: string
    description: string
    platform: string
    required: boolean
    found: boolean
    path: string | null
  }

  interface ScrapeResult {
    gameId: string
    success: boolean
    error?: string
    matched: boolean
    title?: string
  }

  interface ScrapeProgress {
    current: number
    total: number
    currentGame: string
    gameId: string
  }

  interface ElectronAPI {
    window: {
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
      isMaximized: () => Promise<boolean>
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
    }
    dialog: {
      openDirectory: () => Promise<string | null>
      openFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>
    }
    shell: {
      openPath: (path: string) => Promise<string>
      showItemInFolder: (path: string) => void
      openExternal: (url: string) => Promise<void>
    }
    app: {
      getPath: (name: 'userData' | 'home' | 'appData' | 'documents') => Promise<string>
      getVersion: () => Promise<string>
      getPlatform: () => Promise<NodeJS.Platform>
    }
    library: {
      scan: (folders: string[]) => Promise<void>
      getGames: () => Promise<Game[]>
      getGame: (id: string) => Promise<Game | null>
      updateGame: (id: string, data: Partial<Game>) => Promise<void>
      deleteGame: (id: string) => Promise<void>
    }
    emulators: {
      detect: () => Promise<EmulatorInfo[]>
      launch: (gameId: string, emulatorId?: string) => Promise<void>
      getInstalled: () => Promise<EmulatorInfo[]>
      getPlatformsWithEmulator: () => Promise<string[]>
      configure: (emulatorId: string, config: Record<string, unknown>) => Promise<void>
      openSettings: (emulatorId: string) => Promise<void>
      getVersion: (emulatorId: string) => Promise<string>
      onPlaySessionEnded: (callback: (gameId: string, durationMinutes: number) => void) => () => void
    }
    metadata: {
      update: (gameId: string, metadata: Partial<GameMetadata>) => Promise<void>
      scrapeGame: (gameId: string) => Promise<ScrapeResult>
      scrapeGames: (gameIds: string[]) => Promise<ScrapeResult[]>
      scrapeAllGames: () => Promise<ScrapeResult[]>
      cancelScrape: () => Promise<void>
      onScrapeProgress: (callback: (progress: ScrapeProgress) => void) => () => void
    }
    config: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown) => Promise<void>
      getAll: () => Promise<Record<string, unknown>>
    }
    bios: {
      getDefinitions: () => Promise<BiosDefinition[]>
      checkStatus: () => Promise<BiosStatus[]>
      setPath: (biosId: string, path: string) => Promise<BiosStatus[]>
    }
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
