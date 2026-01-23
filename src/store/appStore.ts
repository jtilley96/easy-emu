import { create } from 'zustand'

interface AppState {
  isFirstRun: boolean
  isLoading: boolean
  platform: NodeJS.Platform | null

  // Actions
  checkFirstRun: () => Promise<void>
  setFirstRun: (value: boolean) => void
  setPlatform: (platform: NodeJS.Platform) => void
}

export const useAppStore = create<AppState>((set) => ({
  isFirstRun: false,
  isLoading: true,
  platform: null,

  checkFirstRun: async () => {
    try {
      // Check if config exists via the electron API
      const hasCompletedSetup = await window.electronAPI.config.get('hasCompletedSetup')
      const platform = await window.electronAPI.app.getPlatform()

      set({
        isFirstRun: !hasCompletedSetup,
        isLoading: false,
        platform
      })
    } catch (error) {
      console.error('Failed to check first run:', error)
      set({ isFirstRun: true, isLoading: false })
    }
  },

  setFirstRun: (value: boolean) => {
    set({ isFirstRun: value })
    // Persist to config
    window.electronAPI.config.set('hasCompletedSetup', !value)
  },

  setPlatform: (platform: NodeJS.Platform) => {
    set({ platform })
  }
}))
