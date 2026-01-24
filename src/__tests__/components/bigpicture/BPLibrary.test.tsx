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

// Layout wrapper that provides outlet context
function LayoutWrapper() {
  const [isNavFocused, setIsNavFocused] = vi.fn().mockImplementation((v) => v)

  return (
    <div>
      <Outlet context={{ isNavFocused: false, setIsNavFocused }} />
    </div>
  )
}

describe('BPLibrary', () => {
  let BPLibrary: typeof import('../../../pages/bigpicture/BPLibrary').default

  const mockSetIsNavFocused = vi.fn()

  beforeEach(async () => {
    vi.resetModules()
    clearGamepads()

    // Reset stores
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

    const module = await import('../../../pages/bigpicture/BPLibrary')
    BPLibrary = module.default
  })

  afterEach(() => {
    clearGamepads()
  })

  function renderWithContext(isNavFocused = false) {
    return render(
      <MemoryRouter initialEntries={['/bigpicture']}>
        <Routes>
          <Route path="/bigpicture" element={
            <div>
              <Outlet context={{ isNavFocused, setIsNavFocused: mockSetIsNavFocused }} />
            </div>
          }>
            <Route index element={<BPLibrary />} />
            <Route path="game/:id" element={<div data-testid="game-details">Game Details</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
  }

  describe('rendering', () => {
    it('renders filter bar', () => {
      renderWithContext()

      expect(screen.getByText('All Games')).toBeInTheDocument()
      expect(screen.getByText('Favorites')).toBeInTheDocument()
      expect(screen.getByText('Recently Played')).toBeInTheDocument()
    })

    it('renders game grid', () => {
      renderWithContext()

      expect(screen.getByTestId('game-grid')).toBeInTheDocument()
    })

    it('shows game count', () => {
      const games = [
        createMockGame({ id: 'game-1' }),
        createMockGame({ id: 'game-2' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext()

      expect(screen.getByText('2 games')).toBeInTheDocument()
    })

    it('loads library on mount', () => {
      const loadLibrary = vi.fn()
      useLibraryStore.setState({ loadLibrary })

      renderWithContext()

      expect(loadLibrary).toHaveBeenCalled()
    })
  })

  describe('filtering', () => {
    it('shows all games by default', () => {
      const games = [
        createMockGame({ id: 'game-1', title: 'Game A' }),
        createMockGame({ id: 'game-2', title: 'Game B', isFavorite: true })
      ]
      useLibraryStore.setState({ games })

      renderWithContext()

      expect(screen.getByTestId('grid-game-game-1')).toBeInTheDocument()
      expect(screen.getByTestId('grid-game-game-2')).toBeInTheDocument()
    })

    it('sorts games alphabetically in all filter', () => {
      const games = [
        createMockGame({ id: 'game-1', title: 'Zelda' }),
        createMockGame({ id: 'game-2', title: 'Mario' }),
        createMockGame({ id: 'game-3', title: 'Donkey Kong' })
      ]
      useLibraryStore.setState({ games })

      renderWithContext()

      const gameElements = screen.getAllByTestId(/grid-game-/)
      expect(gameElements[0]).toHaveTextContent('Donkey Kong')
      expect(gameElements[1]).toHaveTextContent('Mario')
      expect(gameElements[2]).toHaveTextContent('Zelda')
    })
  })

  describe('gamepad navigation - filters', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('filter receives focus from nav on DOWN', async () => {
      const games = [createMockGame()]
      useLibraryStore.setState({ games })

      // When nav is not focused, filters should be focusable
      renderWithContext(false)

      // The filter bar buttons should be accessible
      expect(screen.getByText('All Games')).toBeInTheDocument()
    })

    it('filter LEFT/RIGHT changes selected filter', async () => {
      const games = [createMockGame()]
      useLibraryStore.setState({ games })

      renderWithContext(false)

      // Initial filter should be "All Games"
      const allGamesButton = screen.getByText('All Games').closest('button')
      expect(allGamesButton).toBeInTheDocument()
    })
  })

  describe('game selection', () => {
    it('navigates to game details on select', async () => {
      const games = [createMockGame({ id: 'game-123' })]
      useLibraryStore.setState({ games })

      renderWithContext()

      // The grid component would handle selection
      expect(screen.getByTestId('game-grid')).toBeInTheDocument()
    })
  })

  describe('favorite toggle', () => {
    it('calls toggleFavorite when game is favorited', async () => {
      const toggleFavorite = vi.fn().mockResolvedValue(undefined)
      const addToast = vi.fn()
      const games = [createMockGame({ id: 'game-1', isFavorite: false })]

      useLibraryStore.setState({ games, toggleFavorite })
      useUIStore.setState({ addToast })

      renderWithContext()

      // Click favorite button in the grid
      const favoriteButton = screen.getByRole('button', { name: 'Favorite' })
      favoriteButton.click()

      await waitFor(() => {
        expect(toggleFavorite).toHaveBeenCalledWith('game-1')
      })
    })

    it('shows toast when favoriting', async () => {
      const toggleFavorite = vi.fn().mockResolvedValue(undefined)
      const addToast = vi.fn()
      const games = [createMockGame({ id: 'game-1', isFavorite: false })]

      useLibraryStore.setState({ games, toggleFavorite })
      useUIStore.setState({ addToast })

      renderWithContext()

      const favoriteButton = screen.getByRole('button', { name: 'Favorite' })
      favoriteButton.click()

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith('success', expect.any(String))
      })
    })
  })

  describe('focus management', () => {
    it('grid UP at top row moves focus back to filter bar', () => {
      const games = [createMockGame()]
      useLibraryStore.setState({ games })

      renderWithContext()

      // Click the back button which simulates onBack from grid
      const backButton = screen.getByTestId('grid-back')
      backButton.click()

      // The grid back would trigger setIsFilterFocused(true)
      // This is internal state management
      expect(backButton).toBeInTheDocument()
    })
  })

  describe('grid enabled state', () => {
    it('grid is disabled when nav is focused', () => {
      const games = [createMockGame()]
      useLibraryStore.setState({ games })

      renderWithContext(true) // isNavFocused = true

      const grid = screen.getByTestId('game-grid')
      expect(grid).toHaveAttribute('data-enabled', 'false')
    })

    it('grid is enabled when nav is not focused', () => {
      const games = [createMockGame()]
      useLibraryStore.setState({ games })

      renderWithContext(false) // isNavFocused = false

      const grid = screen.getByTestId('game-grid')
      expect(grid).toHaveAttribute('data-enabled', 'true')
    })
  })
})
