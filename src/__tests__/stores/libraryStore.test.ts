import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLibraryStore } from '../../store/libraryStore'
import { createMockGame, getMockElectronAPI } from '../mocks/electronAPI'

describe('libraryStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useLibraryStore.setState({
      games: [],
      romFolders: [],
      isScanning: false,
      scanProgress: null,
      platformsWithEmulator: [],
      isScraping: false,
      scrapeProgress: null
    })
  })

  describe('loadLibrary', () => {
    it('loads games from electronAPI', async () => {
      const mockGames = [
        createMockGame({ id: 'game-1', title: 'Game 1' }),
        createMockGame({ id: 'game-2', title: 'Game 2' })
      ]

      const api = getMockElectronAPI()
      api.library.getGames.mockResolvedValue(mockGames)
      api.config.get.mockResolvedValue(['/roms'])
      api.emulators.getPlatformsWithEmulator.mockResolvedValue(['nes', 'snes'])

      await useLibraryStore.getState().loadLibrary()

      const state = useLibraryStore.getState()
      expect(state.games).toHaveLength(2)
      expect(state.games[0].title).toBe('Game 1')
      expect(state.games[1].title).toBe('Game 2')
    })

    it('loads ROM folders from config', async () => {
      const api = getMockElectronAPI()
      api.config.get.mockResolvedValue(['/roms/nes', '/roms/snes'])
      api.library.getGames.mockResolvedValue([])
      api.emulators.getPlatformsWithEmulator.mockResolvedValue([])

      await useLibraryStore.getState().loadLibrary()

      const state = useLibraryStore.getState()
      expect(state.romFolders).toEqual(['/roms/nes', '/roms/snes'])
    })

    it('loads platforms with emulators', async () => {
      const api = getMockElectronAPI()
      api.config.get.mockResolvedValue(null)
      api.library.getGames.mockResolvedValue([])
      api.emulators.getPlatformsWithEmulator.mockResolvedValue(['nes', 'snes', 'gba'])

      await useLibraryStore.getState().loadLibrary()

      const state = useLibraryStore.getState()
      expect(state.platformsWithEmulator).toEqual(['nes', 'snes', 'gba'])
    })

    it('handles errors gracefully', async () => {
      const api = getMockElectronAPI()
      api.library.getGames.mockRejectedValue(new Error('Failed to load'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await useLibraryStore.getState().loadLibrary()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load library:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('toggleFavorite', () => {
    it('toggles game favorite status from false to true', async () => {
      const game = createMockGame({ id: 'game-1', isFavorite: false })
      useLibraryStore.setState({ games: [game] })

      const api = getMockElectronAPI()
      api.library.updateGame.mockResolvedValue(undefined)

      await useLibraryStore.getState().toggleFavorite('game-1')

      const state = useLibraryStore.getState()
      expect(state.games[0].isFavorite).toBe(true)
      expect(api.library.updateGame).toHaveBeenCalledWith('game-1', { isFavorite: true })
    })

    it('toggles game favorite status from true to false', async () => {
      const game = createMockGame({ id: 'game-1', isFavorite: true })
      useLibraryStore.setState({ games: [game] })

      const api = getMockElectronAPI()
      api.library.updateGame.mockResolvedValue(undefined)

      await useLibraryStore.getState().toggleFavorite('game-1')

      const state = useLibraryStore.getState()
      expect(state.games[0].isFavorite).toBe(false)
    })

    it('does nothing if game not found', async () => {
      useLibraryStore.setState({ games: [] })

      const api = getMockElectronAPI()

      await useLibraryStore.getState().toggleFavorite('nonexistent')

      expect(api.library.updateGame).not.toHaveBeenCalled()
    })
  })

  describe('updateGame', () => {
    it('updates game data in state', async () => {
      const game = createMockGame({ id: 'game-1', title: 'Old Title' })
      useLibraryStore.setState({ games: [game] })

      const api = getMockElectronAPI()
      api.library.updateGame.mockResolvedValue(undefined)

      await useLibraryStore.getState().updateGame('game-1', { title: 'New Title' })

      const state = useLibraryStore.getState()
      expect(state.games[0].title).toBe('New Title')
    })

    it('calls electronAPI to persist changes', async () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      const api = getMockElectronAPI()
      api.library.updateGame.mockResolvedValue(undefined)

      await useLibraryStore.getState().updateGame('game-1', { rating: 5 })

      expect(api.library.updateGame).toHaveBeenCalledWith('game-1', { rating: 5 })
    })

    it('throws error on failure', async () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      const api = getMockElectronAPI()
      api.library.updateGame.mockRejectedValue(new Error('Update failed'))

      await expect(
        useLibraryStore.getState().updateGame('game-1', { title: 'New' })
      ).rejects.toThrow('Update failed')
    })
  })

  describe('handlePlaySessionEnded', () => {
    it('updates play time for game', () => {
      const game = createMockGame({ id: 'game-1', playTime: 60 })
      useLibraryStore.setState({ games: [game] })

      useLibraryStore.getState().handlePlaySessionEnded('game-1', 30)

      const state = useLibraryStore.getState()
      expect(state.games[0].playTime).toBe(90)
    })

    it('handles game with no previous play time', () => {
      const game = createMockGame({ id: 'game-1', playTime: undefined })
      useLibraryStore.setState({ games: [game] })

      useLibraryStore.getState().handlePlaySessionEnded('game-1', 15)

      const state = useLibraryStore.getState()
      expect(state.games[0].playTime).toBe(15)
    })

    it('does not affect other games', () => {
      const games = [
        createMockGame({ id: 'game-1', playTime: 60 }),
        createMockGame({ id: 'game-2', playTime: 30 })
      ]
      useLibraryStore.setState({ games })

      useLibraryStore.getState().handlePlaySessionEnded('game-1', 10)

      const state = useLibraryStore.getState()
      expect(state.games[0].playTime).toBe(70)
      expect(state.games[1].playTime).toBe(30)
    })
  })

  describe('addRomFolder', () => {
    it('adds new ROM folder to list', () => {
      useLibraryStore.setState({ romFolders: ['/existing'] })

      const api = getMockElectronAPI()

      useLibraryStore.getState().addRomFolder('/new/folder')

      const state = useLibraryStore.getState()
      expect(state.romFolders).toContain('/new/folder')
      expect(api.config.set).toHaveBeenCalledWith('romFolders', ['/existing', '/new/folder'])
    })

    it('does not add duplicate folders', () => {
      useLibraryStore.setState({ romFolders: ['/existing'] })

      const api = getMockElectronAPI()

      useLibraryStore.getState().addRomFolder('/existing')

      const state = useLibraryStore.getState()
      expect(state.romFolders).toEqual(['/existing'])
      expect(api.config.set).not.toHaveBeenCalled()
    })
  })

  describe('removeRomFolder', () => {
    it('removes ROM folder from list', () => {
      useLibraryStore.setState({ romFolders: ['/folder1', '/folder2'] })

      const api = getMockElectronAPI()

      useLibraryStore.getState().removeRomFolder('/folder1')

      const state = useLibraryStore.getState()
      expect(state.romFolders).toEqual(['/folder2'])
      expect(api.config.set).toHaveBeenCalledWith('romFolders', ['/folder2'])
    })
  })

  describe('deleteGame', () => {
    it('removes game from state', async () => {
      const games = [
        createMockGame({ id: 'game-1' }),
        createMockGame({ id: 'game-2' })
      ]
      useLibraryStore.setState({ games })

      const api = getMockElectronAPI()
      api.library.deleteGame.mockResolvedValue(undefined)

      await useLibraryStore.getState().deleteGame('game-1')

      const state = useLibraryStore.getState()
      expect(state.games).toHaveLength(1)
      expect(state.games[0].id).toBe('game-2')
    })

    it('calls electronAPI to delete', async () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      const api = getMockElectronAPI()
      api.library.deleteGame.mockResolvedValue(undefined)

      await useLibraryStore.getState().deleteGame('game-1')

      expect(api.library.deleteGame).toHaveBeenCalledWith('game-1')
    })
  })

  describe('launchGame', () => {
    it('calls electronAPI to launch game', async () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      const api = getMockElectronAPI()
      api.emulators.launch.mockResolvedValue(undefined)
      api.library.updateGame.mockResolvedValue(undefined)

      await useLibraryStore.getState().launchGame('game-1')

      expect(api.emulators.launch).toHaveBeenCalledWith('game-1', undefined)
    })

    it('launches with specific emulator when provided', async () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      const api = getMockElectronAPI()
      api.emulators.launch.mockResolvedValue(undefined)
      api.library.updateGame.mockResolvedValue(undefined)

      await useLibraryStore.getState().launchGame('game-1', 'retroarch')

      expect(api.emulators.launch).toHaveBeenCalledWith('game-1', 'retroarch')
    })

    it('updates lastPlayed timestamp', async () => {
      const game = createMockGame({ id: 'game-1', lastPlayed: undefined })
      useLibraryStore.setState({ games: [game] })

      const api = getMockElectronAPI()
      api.emulators.launch.mockResolvedValue(undefined)
      api.library.updateGame.mockResolvedValue(undefined)

      await useLibraryStore.getState().launchGame('game-1')

      expect(api.library.updateGame).toHaveBeenCalledWith('game-1', {
        lastPlayed: expect.any(String)
      })
    })
  })

  describe('scanLibrary', () => {
    it('sets isScanning to true during scan', async () => {
      useLibraryStore.setState({ romFolders: ['/roms'] })

      const api = getMockElectronAPI()
      let resolvePromise: () => void
      api.library.scan.mockImplementation(() => new Promise(resolve => {
        resolvePromise = resolve
      }))
      api.library.getGames.mockResolvedValue([])

      const scanPromise = useLibraryStore.getState().scanLibrary()

      expect(useLibraryStore.getState().isScanning).toBe(true)

      resolvePromise!()
      await scanPromise

      expect(useLibraryStore.getState().isScanning).toBe(false)
    })

    it('does nothing if no ROM folders', async () => {
      useLibraryStore.setState({ romFolders: [] })

      const api = getMockElectronAPI()

      await useLibraryStore.getState().scanLibrary()

      expect(api.library.scan).not.toHaveBeenCalled()
    })

    it('reloads games after scan completes', async () => {
      useLibraryStore.setState({ romFolders: ['/roms'], games: [] })

      const newGames = [createMockGame({ id: 'found-game' })]
      const api = getMockElectronAPI()
      api.library.scan.mockResolvedValue(undefined)
      api.library.getGames.mockResolvedValue(newGames)

      await useLibraryStore.getState().scanLibrary()

      const state = useLibraryStore.getState()
      expect(state.games).toEqual(newGames)
    })
  })
})
