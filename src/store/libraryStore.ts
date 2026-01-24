import { create } from 'zustand'
import { Game } from '../types'

interface LibraryState {
  games: Game[]
  romFolders: string[]
  isScanning: boolean
  scanProgress: { total: number; scanned: number; current: string } | null

  // Actions
  loadLibrary: () => Promise<void>
  addRomFolder: (path: string) => void
  removeRomFolder: (path: string) => void
  scanLibrary: () => Promise<void>
  launchGame: (gameId: string, emulatorId?: string) => Promise<void>
  updateGame: (gameId: string, data: Partial<Game>) => Promise<void>
  toggleFavorite: (gameId: string) => Promise<void>
  deleteGame: (gameId: string) => Promise<void>
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  games: [],
  romFolders: [],
  isScanning: false,
  scanProgress: null,

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
    } catch (error) {
      console.error('Failed to load library:', error)
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

      // Update last played timestamp
      const game = get().games.find(g => g.id === gameId)
      if (game) {
        const updatedGame = {
          ...game,
          lastPlayed: new Date().toISOString()
        }
        set(state => ({
          games: state.games.map(g => g.id === gameId ? updatedGame : g)
        }))
      }
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
  }
}))
