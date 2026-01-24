import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      ipcRenderer.on('window:maximizeChanged', (_event, isMaximized) => callback(isMaximized))
    }
  },

  // Dialog
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    openFile: (filters?: { name: string; extensions: string[] }[]) =>
      ipcRenderer.invoke('dialog:openFile', filters)
  },

  // Shell
  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),
    showItemInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path),
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  },

  // App
  app: {
    getPath: (name: 'userData' | 'home' | 'appData' | 'documents') =>
      ipcRenderer.invoke('app:getPath', name),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform')
  },

  // Library operations
  library: {
    scan: (folders: string[]) => ipcRenderer.invoke('library:scan', folders),
    getGames: () => ipcRenderer.invoke('library:getGames'),
    getGame: (id: string) => ipcRenderer.invoke('library:getGame', id),
    updateGame: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('library:updateGame', id, data),
    deleteGame: (id: string) => ipcRenderer.invoke('library:deleteGame', id)
  },

  // Emulator operations
  emulators: {
    detect: () => ipcRenderer.invoke('emulators:detect'),
    launch: (gameId: string, emulatorId?: string) =>
      ipcRenderer.invoke('emulators:launch', gameId, emulatorId),
    getInstalled: () => ipcRenderer.invoke('emulators:getInstalled'),
    getPlatformsWithEmulator: () => ipcRenderer.invoke('emulators:getPlatformsWithEmulator'),
    configure: (emulatorId: string, config: Record<string, unknown>) =>
      ipcRenderer.invoke('emulators:configure', emulatorId, config),
    openSettings: (emulatorId: string) => ipcRenderer.invoke('emulators:openSettings', emulatorId),
    getVersion: (emulatorId: string) => ipcRenderer.invoke('emulators:getVersion', emulatorId),
    onPlaySessionEnded: (callback: (gameId: string, durationMinutes: number) => void) => {
      const fn = (_: unknown, payload: { gameId: string; durationMinutes: number }) =>
        callback(payload.gameId, payload.durationMinutes)
      ipcRenderer.on('emulators:playSessionEnded', fn)
      return () => ipcRenderer.removeListener('emulators:playSessionEnded', fn)
    }
  },

  // Metadata operations
  metadata: {
    update: (gameId: string, metadata: Record<string, unknown>) =>
      ipcRenderer.invoke('metadata:update', gameId, metadata),
    scrapeGame: (gameId: string) =>
      ipcRenderer.invoke('hasheous:scrapeGame', gameId),
    scrapeGames: (gameIds: string[]) =>
      ipcRenderer.invoke('hasheous:scrapeGames', gameIds),
    scrapeAllGames: () =>
      ipcRenderer.invoke('hasheous:scrapeAllGames'),
    cancelScrape: () =>
      ipcRenderer.invoke('hasheous:cancelScrape'),
    onScrapeProgress: (callback: (progress: ScrapeProgress) => void) => {
      const fn = (_: unknown, progress: ScrapeProgress) => callback(progress)
      ipcRenderer.on('hasheous:scrapeProgress', fn)
      return () => ipcRenderer.removeListener('hasheous:scrapeProgress', fn)
    }
  },

  // Config operations
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:getAll')
  },

  // BIOS operations
  bios: {
    getDefinitions: () => ipcRenderer.invoke('bios:getDefinitions'),
    checkStatus: () => ipcRenderer.invoke('bios:checkStatus'),
    setPath: (biosId: string, path: string) => ipcRenderer.invoke('bios:setPath', biosId, path)
  }
})

// Type declarations for the exposed API
export interface ElectronAPI {
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

interface Game {
  id: string
  title: string
  platform: string
  path: string
  coverPath?: string
  lastPlayed?: string
  playTime?: number
}

interface EmulatorInfo {
  id: string
  name: string
  path: string | null
  platforms: string[]
  installed: boolean
  canInstall: boolean
  downloadUrl: string | null
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

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
