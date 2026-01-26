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

  // Embedded Emulator Types
  interface InstalledCore {
    id: string
    name: string
    platforms: string[]
    coreName: string
    dataPath: string
    installedAt: string
    version: string
  }

  interface AvailableCore {
    id: string
    name: string
    platforms: string[]
    coreName: string
    size: number
    installed: boolean
  }

  interface CoreDownloadProgress {
    coreId: string
    status: 'downloading' | 'verifying' | 'complete' | 'error'
    progress: number
    downloadedBytes: number
    totalBytes: number
    error?: string
  }

  interface EmbeddedPlayCapability {
    canPlay: boolean
    reason?: string
    coreName?: string
  }

  interface CorePaths {
    dataPath: string
    coreName: string
  }

  interface EmbeddedConfig {
    preferEmbedded: boolean
    embeddedShader: string
    embeddedIntegerScaling: boolean
  }

  interface SaveStateInfo {
    slot: number
    exists: boolean
    timestamp?: string
    screenshotPath?: string
    size?: number
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
      openDirectory: (defaultPath?: string) => Promise<string | null>
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
      scan: (folders: string[]) => Promise<{ added: number; removed: number }>
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
    cores: {
      getInstalled: () => Promise<InstalledCore[]>
      getAvailable: () => Promise<AvailableCore[]>
      download: (coreId: string) => Promise<void>
      delete: (coreId: string) => Promise<void>
      getForPlatform: (platform: string) => Promise<InstalledCore | null>
      canPlayEmbedded: (platform: string) => Promise<boolean>
      onDownloadProgress: (callback: (progress: CoreDownloadProgress) => void) => () => void
    }
    embedded: {
      canPlay: (platform: string) => Promise<EmbeddedPlayCapability>
      getCorePaths: (platform: string) => Promise<CorePaths | null>
      startSession: (gameId: string) => Promise<{ success: boolean; error?: string }>
      endSession: (gameId: string, playTimeMs?: number) => Promise<void>
      getGameRomPath: (gameId: string) => Promise<string | null>
      getGameInfo: (gameId: string) => Promise<{ path: string; platform: string; title: string } | null>
      getGameRomData: (gameId: string) => Promise<Uint8Array | null>
      getSystem: (platform: string) => Promise<string>
      getCoresPath: () => Promise<string>
      getConfig: () => Promise<EmbeddedConfig>
      onSessionEnded: (callback: (gameId: string, durationMinutes: number) => void) => () => void
    }
    saves: {
      loadSRAM: (gameId: string) => Promise<ArrayBuffer | null>
      saveSRAM: (gameId: string, data: ArrayBuffer) => Promise<void>
      saveState: (gameId: string, slot: number, data: ArrayBuffer, screenshot?: ArrayBuffer) => Promise<void>
      loadState: (gameId: string, slot: number) => Promise<ArrayBuffer | null>
      deleteState: (gameId: string, slot: number) => Promise<void>
      listStates: (gameId: string) => Promise<SaveStateInfo[]>
      getStateScreenshot: (gameId: string, slot: number) => Promise<ArrayBuffer | null>
    }
  }

  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
