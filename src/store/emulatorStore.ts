import { create } from 'zustand'
import {
  InstalledCore,
  AvailableCore,
  CoreDownloadProgress,
  EmbeddedPlayCapability,
  SaveStateInfo
} from '../types'

interface EmulatorState {
  // Core management
  installedCores: InstalledCore[]
  availableCores: AvailableCore[]
  downloadingCores: Record<string, CoreDownloadProgress>

  // Emulator state
  isPlaying: boolean
  currentGameId: string | null
  sessionStartTime: number | null
  isPaused: boolean
  volume: number
  isMuted: boolean

  // Settings
  preferEmbedded: boolean

  // Actions - Core management
  loadCores: () => Promise<void>
  downloadCore: (coreId: string) => Promise<void>
  deleteCore: (coreId: string) => Promise<void>
  setDownloadProgress: (coreId: string, progress: CoreDownloadProgress | null) => void

  // Actions - Play control
  checkCanPlayEmbedded: (platform: string) => Promise<EmbeddedPlayCapability>
  startGame: (gameId: string) => Promise<{ success: boolean; error?: string }>
  stopGame: (playTimeMs?: number) => Promise<void>

  // Actions - Emulator control
  setPlaying: (isPlaying: boolean) => void
  setPaused: (isPaused: boolean) => void
  setVolume: (volume: number) => void
  setMuted: (isMuted: boolean) => void

  // Actions - Save states
  loadSRAM: (gameId: string) => Promise<ArrayBuffer | null>
  saveSRAM: (gameId: string, data: ArrayBuffer) => Promise<void>
  saveState: (gameId: string, slot: number, data: ArrayBuffer, screenshot?: ArrayBuffer) => Promise<void>
  loadState: (gameId: string, slot: number) => Promise<ArrayBuffer | null>
  deleteState: (gameId: string, slot: number) => Promise<void>
  listStates: (gameId: string) => Promise<SaveStateInfo[]>

  // Actions - Settings
  setPreferEmbedded: (prefer: boolean) => Promise<void>
}

export const useEmulatorStore = create<EmulatorState>((set, get) => ({
  // Initial state
  installedCores: [],
  availableCores: [],
  downloadingCores: {},
  isPlaying: false,
  currentGameId: null,
  sessionStartTime: null,
  isPaused: false,
  volume: 1.0,
  isMuted: false,
  preferEmbedded: true,

  // Core management actions
  loadCores: async () => {
    try {
      const [installed, available] = await Promise.all([
        window.electronAPI.cores.getInstalled(),
        window.electronAPI.cores.getAvailable()
      ])
      set({ installedCores: installed, availableCores: available })
    } catch (error) {
      console.error('Failed to load cores:', error)
    }
  },

  downloadCore: async (coreId: string) => {
    try {
      // Mark as downloading
      set(state => ({
        downloadingCores: {
          ...state.downloadingCores,
          [coreId]: {
            coreId,
            status: 'downloading',
            progress: 0,
            downloadedBytes: 0,
            totalBytes: 0
          }
        }
      }))

      await window.electronAPI.cores.download(coreId)

      // Reload cores after download
      await get().loadCores()

      // Remove from downloading
      set(state => {
        const { [coreId]: _, ...rest } = state.downloadingCores
        return { downloadingCores: rest }
      })
    } catch (error) {
      console.error('Failed to download core:', error)
      set(state => ({
        downloadingCores: {
          ...state.downloadingCores,
          [coreId]: {
            ...state.downloadingCores[coreId],
            status: 'error',
            error: (error as Error).message
          }
        }
      }))
      throw error
    }
  },

  deleteCore: async (coreId: string) => {
    try {
      await window.electronAPI.cores.delete(coreId)
      await get().loadCores()
    } catch (error) {
      console.error('Failed to delete core:', error)
      throw error
    }
  },

  setDownloadProgress: (coreId: string, progress: CoreDownloadProgress | null) => {
    if (progress === null) {
      set(state => {
        const { [coreId]: _, ...rest } = state.downloadingCores
        return { downloadingCores: rest }
      })
    } else {
      set(state => ({
        downloadingCores: {
          ...state.downloadingCores,
          [coreId]: progress
        }
      }))
    }
  },

  // Play control actions
  checkCanPlayEmbedded: async (platform: string) => {
    return await window.electronAPI.embedded.canPlay(platform)
  },

  startGame: async (gameId: string) => {
    const result = await window.electronAPI.embedded.startSession(gameId)
    if (result.success) {
      set({
        isPlaying: true,
        currentGameId: gameId,
        sessionStartTime: Date.now(),
        isPaused: false
      })
    }
    return result
  },

  stopGame: async (playTimeMs?: number) => {
    const { currentGameId, sessionStartTime } = get()
    if (currentGameId) {
      const elapsed = playTimeMs ?? (sessionStartTime ? Date.now() - sessionStartTime : 0)
      await window.electronAPI.embedded.endSession(currentGameId, elapsed)
    }
    set({
      isPlaying: false,
      currentGameId: null,
      sessionStartTime: null,
      isPaused: false
    })
  },

  // Emulator control actions
  setPlaying: (isPlaying: boolean) => set({ isPlaying }),
  setPaused: (isPaused: boolean) => set({ isPaused }),
  setVolume: (volume: number) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setMuted: (isMuted: boolean) => set({ isMuted }),

  // Save state actions
  loadSRAM: async (gameId: string) => {
    return await window.electronAPI.saves.loadSRAM(gameId)
  },

  saveSRAM: async (gameId: string, data: ArrayBuffer) => {
    await window.electronAPI.saves.saveSRAM(gameId, data)
  },

  saveState: async (gameId: string, slot: number, data: ArrayBuffer, screenshot?: ArrayBuffer) => {
    await window.electronAPI.saves.saveState(gameId, slot, data, screenshot)
  },

  loadState: async (gameId: string, slot: number) => {
    return await window.electronAPI.saves.loadState(gameId, slot)
  },

  deleteState: async (gameId: string, slot: number) => {
    await window.electronAPI.saves.deleteState(gameId, slot)
  },

  listStates: async (gameId: string) => {
    return await window.electronAPI.saves.listStates(gameId)
  },

  // Settings actions
  setPreferEmbedded: async (prefer: boolean) => {
    await window.electronAPI.config.set('preferEmbedded', prefer)
    set({ preferEmbedded: prefer })
  }
}))
