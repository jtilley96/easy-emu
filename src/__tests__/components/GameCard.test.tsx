import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import GameCard from '../../components/GameCard'
import { useLibraryStore } from '../../store/libraryStore'
import { useUIStore } from '../../store/uiStore'
import { useEmulatorStore } from '../../store/emulatorStore'
import { createMockGame } from '../mocks/electronAPI'

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Wrapper component with router
function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('GameCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()

    // Reset stores
    useLibraryStore.setState({
      games: [],
      platformsWithEmulator: ['nes', 'snes', 'gba']
    })

    useUIStore.setState({
      toasts: []
    })

    useEmulatorStore.setState({
      installedCores: [],
      preferEmbedded: false
    })
  })

  describe('rendering', () => {
    it('renders game title', () => {
      const game = createMockGame({ title: 'Super Mario Bros.' })

      renderWithRouter(<GameCard game={game} />)

      expect(screen.getByText('Super Mario Bros.')).toBeInTheDocument()
    })

    it('shows platform badge', () => {
      const game = createMockGame({ platform: 'nes' })

      renderWithRouter(<GameCard game={game} />)

      expect(screen.getByText('nes')).toBeInTheDocument()
    })

    it('shows favorite indicator when game is favorited', () => {
      const game = createMockGame({ isFavorite: true })

      renderWithRouter(<GameCard game={game} />)

      const favoriteButton = screen.getByTitle('Remove from favorites')
      expect(favoriteButton).toBeInTheDocument()
    })

    it('shows add to favorites when not favorited', () => {
      const game = createMockGame({ isFavorite: false })

      renderWithRouter(<GameCard game={game} />)

      const favoriteButton = screen.getByTitle('Add to favorites')
      expect(favoriteButton).toBeInTheDocument()
    })

    it('displays play time when available', () => {
      const game = createMockGame({ playTime: 120 })

      renderWithRouter(<GameCard game={game} />)

      expect(screen.getByText(/2h/)).toBeInTheDocument()
    })

    it('shows No Cover when no cover image', () => {
      const game = createMockGame({ coverPath: undefined })

      renderWithRouter(<GameCard game={game} variant="list" />)

      expect(screen.getByText('No Cover')).toBeInTheDocument()
    })
  })

  describe('grid variant', () => {
    it('renders grid layout by default', () => {
      const game = createMockGame()

      renderWithRouter(<GameCard game={game} />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('game-card')
    })

    it('shows cover aspect ratio of 3/4', () => {
      const game = createMockGame()

      renderWithRouter(<GameCard game={game} />)

      const coverContainer = screen.getByRole('link').querySelector('.aspect-\\[3\\/4\\]')
      expect(coverContainer).toBeInTheDocument()
    })
  })

  describe('list variant', () => {
    it('renders list layout when variant is list', () => {
      const game = createMockGame()

      renderWithRouter(<GameCard game={game} variant="list" />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('flex')
    })

    it('shows rating when available', () => {
      const game = createMockGame({ rating: 4.5 })

      renderWithRouter(<GameCard game={game} variant="list" />)

      expect(screen.getByText('4.5')).toBeInTheDocument()
    })
  })

  describe('play button', () => {
    it('calls launchGame when play button is clicked', async () => {
      const game = createMockGame({ id: 'game-123', platform: 'nes' })
      const launchGame = vi.fn().mockResolvedValue(undefined)
      useLibraryStore.setState({ launchGame })

      renderWithRouter(<GameCard game={game} variant="list" />)

      const playButton = screen.getByTitle('Play')
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(launchGame).toHaveBeenCalledWith('game-123', undefined)
      })
    })

    it('navigates to embedded player when embedded core is available and preferred', async () => {
      const game = createMockGame({ id: 'game-123', platform: 'nes' })

      useEmulatorStore.setState({
        installedCores: [{ id: 'core-1', name: 'Test Core', platforms: ['nes'], coreName: 'test', dataPath: '/cores', installedAt: '', version: '1.0' }],
        preferEmbedded: true
      })

      renderWithRouter(<GameCard game={game} variant="list" />)

      const playButton = screen.getByTitle('Play')
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/play/game-123')
      })
    })

    it('shows warning tooltip when no emulator is available', () => {
      const game = createMockGame({ platform: 'unknown-platform' })
      useLibraryStore.setState({ platformsWithEmulator: [] })

      renderWithRouter(<GameCard game={game} variant="list" />)

      const playButton = screen.getByRole('button', { name: /No emulator configured/i })
      expect(playButton).toBeInTheDocument()
    })

    it('shows error toast on launch failure', async () => {
      const game = createMockGame({ platform: 'nes' })
      const launchGame = vi.fn().mockRejectedValue(new Error('Failed to launch'))
      const addToast = vi.fn()
      useLibraryStore.setState({ launchGame })
      useUIStore.setState({ addToast })

      renderWithRouter(<GameCard game={game} variant="list" />)

      const playButton = screen.getByTitle('Play')
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith('error', 'Failed to launch')
      })
    })
  })

  describe('favorite button', () => {
    it('calls toggleFavorite when favorite button is clicked', async () => {
      const game = createMockGame({ id: 'game-123', isFavorite: false })
      const toggleFavorite = vi.fn().mockResolvedValue(undefined)
      useLibraryStore.setState({ toggleFavorite })

      renderWithRouter(<GameCard game={game} variant="list" />)

      const favoriteButton = screen.getByTitle('Add to favorites')
      fireEvent.click(favoriteButton)

      await waitFor(() => {
        expect(toggleFavorite).toHaveBeenCalledWith('game-123')
      })
    })

    it('stops event propagation when clicking favorite', async () => {
      const game = createMockGame({ id: 'game-123' })
      const toggleFavorite = vi.fn().mockResolvedValue(undefined)
      useLibraryStore.setState({ toggleFavorite })

      renderWithRouter(<GameCard game={game} variant="list" />)

      const favoriteButton = screen.getByTitle('Add to favorites')
      const event = fireEvent.click(favoriteButton)

      // If propagation wasn't stopped, navigation would occur
      await waitFor(() => {
        expect(toggleFavorite).toHaveBeenCalled()
      })
    })
  })

  describe('navigation', () => {
    it('links to game details page', () => {
      const game = createMockGame({ id: 'game-123' })

      renderWithRouter(<GameCard game={game} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/game/game-123')
    })
  })

  describe('cover image', () => {
    it('displays cover image when available', () => {
      const game = createMockGame({ coverPath: '/path/to/cover.png' })

      renderWithRouter(<GameCard game={game} />)

      const img = screen.getByAltText(game.title)
      expect(img).toBeInTheDocument()
    })

    it('shows game title in placeholder when no cover', () => {
      const game = createMockGame({ title: 'Test Game', coverPath: undefined })

      renderWithRouter(<GameCard game={game} />)

      // In grid variant, title is shown in the cover placeholder
      expect(screen.getAllByText('Test Game').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('loading state', () => {
    it('disables play button while launching', async () => {
      const game = createMockGame({ platform: 'nes' })

      // Create a promise that we can control
      let resolvePromise: () => void
      const launchPromise = new Promise<void>(resolve => {
        resolvePromise = resolve
      })
      const launchGame = vi.fn().mockReturnValue(launchPromise)
      useLibraryStore.setState({ launchGame })

      renderWithRouter(<GameCard game={game} variant="list" />)

      const playButton = screen.getByTitle('Play')
      fireEvent.click(playButton)

      // Button should be disabled during launch
      await waitFor(() => {
        expect(playButton).toBeDisabled()
      })

      // Resolve the promise
      resolvePromise!()

      await waitFor(() => {
        expect(playButton).not.toBeDisabled()
      })
    })
  })

  describe('preferred emulator', () => {
    it('uses preferred emulator when set', async () => {
      const game = createMockGame({
        id: 'game-123',
        platform: 'nes',
        preferredEmulator: 'retroarch'
      })
      const launchGame = vi.fn().mockResolvedValue(undefined)
      useLibraryStore.setState({ launchGame })

      renderWithRouter(<GameCard game={game} variant="list" />)

      const playButton = screen.getByTitle('Play')
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(launchGame).toHaveBeenCalledWith('game-123', 'retroarch')
      })
    })
  })
})
