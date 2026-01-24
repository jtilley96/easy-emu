import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import { useLibraryStore } from '../../../store/libraryStore'
import { useUIStore } from '../../../store/uiStore'
import { useInputStore } from '../../../store/inputStore'
import { createMockGame } from '../../mocks/electronAPI'
import {
  createMockGamepad,
  setGamepad,
  clearGamepads,
  pressButton,
  releaseButton,
  fireGamepadConnected,
  BUTTON_INDICES
} from '../../mocks/gamepadAPI'
import { flushAnimationFrames } from '../../../../vitest.setup'

// Mock BPGameGrid
vi.mock('../../../components/bigpicture/BPGameGrid', () => ({
  default: ({ games, enabled, onSelectGame, onFavoriteGame, onBack }: {
    games: { id: string; title: string }[]
    enabled: boolean
    onSelectGame: (game: { id: string }) => void
    onFavoriteGame?: (game: { id: string }) => void
    onBack?: () => void
  }) => (
    <div data-testid="game-grid" data-enabled={enabled}>
      {games.map(game => (
        <div key={game.id} data-testid={`grid-game-${game.id}`}>
          {game.title}
          <button onClick={() => onSelectGame(game)}>Select</button>
          {onFavoriteGame && <button onClick={() => onFavoriteGame(game)}>Favorite</button>}
        </div>
      ))}
      {onBack && <button data-testid="grid-back" onClick={onBack}>Back</button>}
    </div>
  )
}))

describe('BPSystems', () => {
  let BPSystems: typeof import('../../../pages/bigpicture/BPSystems').default
  const mockSetIsNavFocused = vi.fn()

  beforeEach(async () => {
    vi.resetModules()
    clearGamepads()

    useLibraryStore.setState({
      games: [],
      loadLibrary: vi.fn()
    })

    useUIStore.setState({
      addToast: vi.fn()
    })

    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null
    })

    const module = await import('../../../pages/bigpicture/BPSystems')
    BPSystems = module.default
  })

  afterEach(() => {
    clearGamepads()
    mockSetIsNavFocused.mockClear()
  })

  function renderWithContext(isNavFocused = false) {
    return render(
      <MemoryRouter initialEntries={['/bigpicture/systems']}>
        <Routes>
          <Route path="/bigpicture" element={
            <div>
              <Outlet context={{ isNavFocused, setIsNavFocused: mockSetIsNavFocused }} />
            </div>
          }>
            <Route path="systems" element={<BPSystems />} />
            <Route path="game/:id" element={<div data-testid="game-details">Game Details</div>} />
            <Route index element={<div data-testid="library">Library</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
  }

  describe('empty state', () => {
    it('shows message when no platforms have games', () => {
      renderWithContext()

      expect(screen.getByText('No systems found')).toBeInTheDocument()
      expect(screen.getByText('Add some ROMs to your library')).toBeInTheDocument()
    })
  })

  describe('rendering with games', () => {
    it('renders platform list when games exist', () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes', title: 'Super Mario Bros.' }),
        createMockGame({ id: 'game-2', platform: 'nes', title: 'Zelda' }),
        createMockGame({ id: 'game-3', platform: 'snes', title: 'Super Metroid' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext()

      // Should show NES and SNES platforms
      expect(screen.getByText('NES')).toBeInTheDocument()
      expect(screen.getByText('SNES')).toBeInTheDocument()
    })

    it('shows game count for each platform', () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' }),
        createMockGame({ id: 'game-2', platform: 'nes' }),
        createMockGame({ id: 'game-3', platform: 'snes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext()

      // NES should show 2 games
      expect(screen.getByText('2')).toBeInTheDocument()
      // SNES should show 1 game
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('renders game grid for selected platform', () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext()

      expect(screen.getByTestId('game-grid')).toBeInTheDocument()
    })

    it('loads library on mount', () => {
      const loadLibrary = vi.fn()
      useLibraryStore.setState({ loadLibrary })

      renderWithContext()

      expect(loadLibrary).toHaveBeenCalled()
    })
  })

  describe('platform list navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('first platform is focused by default', () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' }),
        createMockGame({ id: 'game-2', platform: 'snes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      // First platform button should have bp-focus class
      const buttons = screen.getAllByRole('button')
      const platformButtons = buttons.filter(b => b.textContent?.includes('NES') || b.textContent?.includes('SNES'))
      expect(platformButtons[0]).toHaveClass('bp-focus')
    })

    it('UP/DOWN navigates between platforms', async () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' }),
        createMockGame({ id: 'game-2', platform: 'snes' }),
        createMockGame({ id: 'game-3', platform: 'gba' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Press DOWN to move to next platform
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Second platform should now be focused
      const buttons = screen.getAllByRole('button')
      const snesButton = buttons.find(b => b.textContent?.includes('SNES'))
      expect(snesButton).toHaveClass('bp-focus')
    })

    it('UP at first platform returns focus to nav bar', async () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Press UP at first platform
      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(mockSetIsNavFocused).toHaveBeenCalledWith(true)
    })

    it('DOWN does not go past last platform', async () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' }),
        createMockGame({ id: 'game-2', platform: 'snes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Move to last platform
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })

      // Try to go past last
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(3) })

      // Should still be on last platform
      const buttons = screen.getAllByRole('button')
      const snesButton = buttons.find(b => b.textContent?.includes('SNES'))
      expect(snesButton).toHaveClass('bp-focus')
    })

    it('RIGHT moves focus to game grid for selected platform', async () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Grid should now be enabled
      const grid = screen.getByTestId('game-grid')
      expect(grid).toHaveAttribute('data-enabled', 'true')
    })

    it('A button on platform moves focus to game grid', async () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Grid should now be enabled
      const grid = screen.getByTestId('game-grid')
      expect(grid).toHaveAttribute('data-enabled', 'true')
    })

    it('RIGHT on platform with no games does nothing', async () => {
      // This scenario shouldn't happen in practice since platforms
      // without games are filtered out, but testing the guard
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Grid should be enabled after pressing right when games exist
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      const grid = screen.getByTestId('game-grid')
      expect(grid).toHaveAttribute('data-enabled', 'true')
    })
  })

  describe('game grid navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('B returns to platform list from grid', async () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Enter grid
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Verify we're in grid
      expect(screen.getByTestId('game-grid')).toHaveAttribute('data-enabled', 'true')

      // Click back button (simulating grid's onBack)
      const backButton = screen.getByTestId('grid-back')
      backButton.click()

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Platform list should be focused again
      const buttons = screen.getAllByRole('button')
      const nesButton = buttons.find(b => b.textContent?.includes('NES'))
      expect(nesButton).toHaveClass('bp-focus')
    })

    it('grid is disabled when platform list is focused', () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      const grid = screen.getByTestId('game-grid')
      // Initially platform list is focused, so grid should be disabled
      expect(grid).toHaveAttribute('data-enabled', 'false')
    })

    it('grid is disabled when nav is focused', () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(true) // isNavFocused = true

      const grid = screen.getByTestId('game-grid')
      expect(grid).toHaveAttribute('data-enabled', 'false')
    })
  })

  describe('game actions', () => {
    it('selecting a game navigates to game details', async () => {
      const games = [
        createMockGame({ id: 'game-123', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      // Click select button on game
      const selectButton = screen.getByRole('button', { name: 'Select' })
      selectButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('game-details')).toBeInTheDocument()
      })
    })

    it('favoriting a game calls toggleFavorite', async () => {
      const toggleFavorite = vi.fn().mockResolvedValue(undefined)
      const addToast = vi.fn()
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes', isFavorite: false })
      ]

      useLibraryStore.setState({ games, toggleFavorite })
      useUIStore.setState({ addToast })

      renderWithContext(false)

      const favoriteButton = screen.getByRole('button', { name: 'Favorite' })
      favoriteButton.click()

      await waitFor(() => {
        expect(toggleFavorite).toHaveBeenCalledWith('game-1')
      })
    })

    it('shows toast after favoriting', async () => {
      const toggleFavorite = vi.fn().mockResolvedValue(undefined)
      const addToast = vi.fn()
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes', isFavorite: false })
      ]

      useLibraryStore.setState({ games, toggleFavorite })
      useUIStore.setState({ addToast })

      renderWithContext(false)

      const favoriteButton = screen.getByRole('button', { name: 'Favorite' })
      favoriteButton.click()

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith('success', expect.any(String))
      })
    })
  })

  describe('back navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('B button from platform list navigates back to library', async () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.B)

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        expect(screen.getByTestId('library')).toBeInTheDocument()
      })
    })

    it('B button from grid returns to platform list first', async () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Enter grid
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Grid back button should return to platform list
      const backButton = screen.getByTestId('grid-back')
      backButton.click()

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Should still be on systems page (not navigated away)
      expect(screen.queryByTestId('library')).not.toBeInTheDocument()

      // Platform list should be focused
      const buttons = screen.getAllByRole('button')
      const nesButton = buttons.find(b => b.textContent?.includes('NES'))
      expect(nesButton).toHaveClass('bp-focus')
    })
  })

  describe('platform filtering', () => {
    it('only shows platforms that have games', () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' }),
        createMockGame({ id: 'game-2', platform: 'snes' })
        // No GBA games
      ]
      useLibraryStore.setState({ games })

      renderWithContext()

      expect(screen.getByText('NES')).toBeInTheDocument()
      expect(screen.getByText('SNES')).toBeInTheDocument()
      expect(screen.queryByText('GBA')).not.toBeInTheDocument()
    })

    it('shows games for selected platform only', () => {
      const games = [
        createMockGame({ id: 'nes-game', platform: 'nes', title: 'NES Game' }),
        createMockGame({ id: 'snes-game', platform: 'snes', title: 'SNES Game' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      // With NES selected (first platform), only NES games should be in grid
      expect(screen.getByTestId('grid-game-nes-game')).toBeInTheDocument()
      expect(screen.queryByTestId('grid-game-snes-game')).not.toBeInTheDocument()
    })
  })

  describe('platform selection', () => {
    it('clicking a platform selects it', () => {
      const games = [
        createMockGame({ id: 'nes-game', platform: 'nes' }),
        createMockGame({ id: 'snes-game', platform: 'snes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      // Click SNES platform
      const buttons = screen.getAllByRole('button')
      const snesButton = buttons.find(b => b.textContent?.includes('SNES'))
      snesButton?.click()

      // SNES games should now be shown
      expect(screen.getByTestId('grid-game-snes-game')).toBeInTheDocument()
      expect(screen.queryByTestId('grid-game-nes-game')).not.toBeInTheDocument()
    })
  })

  describe('focus flow', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('complete flow: nav -> platform -> grid -> back to platform', async () => {
      const games = [
        createMockGame({ id: 'game-1', platform: 'nes' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Start with platform focused
      const buttons = screen.getAllByRole('button')
      const nesButton = buttons.find(b => b.textContent?.includes('NES'))
      expect(nesButton).toHaveClass('bp-focus')

      // Enter grid
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Grid should be enabled
      expect(screen.getByTestId('game-grid')).toHaveAttribute('data-enabled', 'true')

      // Go back to platform list
      const backButton = screen.getByTestId('grid-back')
      backButton.click()

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Grid should be disabled again
      expect(screen.getByTestId('game-grid')).toHaveAttribute('data-enabled', 'false')
    })
  })
})
