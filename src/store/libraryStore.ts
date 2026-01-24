import { create } from 'zustand'
import { Game } from '../types'

interface LibraryState {
  games: Game[]
  romFolders: string[]
  isScanning: boolean
  scanProgress: { total: number; scanned: number; current: string } | null
  platformsWithEmulator: string[]

  // Actions
  loadLibrary: () => Promise<void>
  refreshPlatformsWithEmulator: () => Promise<void>
  addRomFolder: (path: string) => void
  removeRomFolder: (path: string) => void
  scanLibrary: () => Promise<void>
  launchGame: (gameId: string, emulatorId?: string) => Promise<void>
  updateGame: (gameId: string, data: Partial<Game>) => Promise<void>
  toggleFavorite: (gameId: string) => Promise<void>
  deleteGame: (gameId: string) => Promise<void>
  handlePlaySessionEnded: (gameId: string, durationMinutes: number) => void
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  games: [],
  romFolders: [],
  isScanning: false,
  scanProgress: null,
  platformsWithEmulator: [],

  loadLibrary: async () => {
    try {
      // Load ROM folders from config
      const folders = await window.electronAPI.config.get('romFolders') as string[] | null
      if (folders) {
        set({ romFolders: folders })
      }

      // Load games from database
      const games = await window.electronAPI.library.getGames()
      set({ games })

      const platforms = await window.electronAPI.emulators.getPlatformsWithEmulator()
      set({ platformsWithEmulator: platforms })
    } catch (error) {
      console.error('Failed to load library:', error)
    }
  },

  refreshPlatformsWithEmulator: async () => {
    try {
      const platforms = await window.electronAPI.emulators.getPlatformsWithEmulator()
      set({ platformsWithEmulator: platforms })
    } catch (error) {
      console.error('Failed to refresh platforms:', error)
    }
  },

  addRomFolder: (path: string) => {
    const { romFolders } = get()
    if (!romFolders.includes(path)) {
      const updated = [...romFolders, path]
      set({ romFolders: updated })
      window.electronAPI.config.set('romFolders', updated)
    }
  },

  removeRomFolder: (path: string) => {
    const { romFolders } = get()
    const updated = romFolders.filter(f => f !== path)
    set({ romFolders: updated })
    window.electronAPI.config.set('romFolders', updated)
  },

  scanLibrary: async () => {
    const { romFolders } = get()
    if (romFolders.length === 0) return

    set({ isScanning: true, scanProgress: null })

    try {
      await window.electronAPI.library.scan(romFolders)

      // Reload games after scan
      const games = await window.electronAPI.library.getGames()
      set({ games })
    } catch (error) {
      console.error('Failed to scan library:', error)
    } finally {
      set({ isScanning: false, scanProgress: null })
    }
  },

  launchGame: async (gameId: string, emulatorId?: string) => {
    try {
      await window.electronAPI.emulators.launch(gameId, emulatorId)

      // Persist last played and update local state
      const lastPlayed = new Date().toISOString()
      await get().updateGame(gameId, { lastPlayed })
    } catch (error) {
      console.error('Failed to launch game:', error)
      throw error
    }
  },

  updateGame: async (gameId: string, data: Partial<Game>) => {
    try {
      await window.electronAPI.library.updateGame(gameId, data)

      set(state => ({
        games: state.games.map(g =>
          g.id === gameId ? { ...g, ...data } : g
        )
      }))
    } catch (error) {
      console.error('Failed to update game:', error)
      throw error
    }
  },

  toggleFavorite: async (gameId: string) => {
    const game = get().games.find(g => g.id === gameId)
    if (game) {
      await get().updateGame(gameId, { isFavorite: !game.isFavorite })
    }
  },

  deleteGame: async (gameId: string) => {
    try {
      await window.electronAPI.library.deleteGame(gameId)

      // Remove game from state
      set(state => ({
        games: state.games.filter(g => g.id !== gameId)
      }))
    } catch (error) {
      console.error('Failed to delete game:', error)
      throw error
    }
  },

  handlePlaySessionEnded: (gameId: string, durationMinutes: number) => {
    set(state => ({
      games: state.games.map(g =>
        g.id === gameId
          ? { ...g, playTime: (g.playTime ?? 0) + durationMinutes }
          : g
      )
    }))
  }
}))
