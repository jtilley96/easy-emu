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
    showItemInFolder: (path: string) => ipcRenderer.invoke('shell:showItemInFolder', path)
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
    configure: (emulatorId: string, config: Record<string, unknown>) =>
      ipcRenderer.invoke('emulators:configure', emulatorId, config)
  },

  // Metadata operations
  metadata: {
    scrape: (gameId: string) => ipcRenderer.invoke('metadata:scrape', gameId),
    scrapeAll: () => ipcRenderer.invoke('metadata:scrapeAll'),
    update: (gameId: string, metadata: Record<string, unknown>) =>
      ipcRenderer.invoke('metadata:update', gameId, metadata)
  },

  // Config operations
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
    getAll: () => ipcRenderer.invoke('config:getAll')
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
    configure: (emulatorId: string, config: Record<string, unknown>) => Promise<void>
  }
  metadata: {
    scrape: (gameId: string) => Promise<GameMetadata>
    scrapeAll: () => Promise<void>
    update: (gameId: string, metadata: Partial<GameMetadata>) => Promise<void>
  }
  config: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    getAll: () => Promise<Record<string, unknown>>
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
  path: string
  platforms: string[]
  installed: boolean
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

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
