import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
import { useLibraryStore } from '../../../store/libraryStore'
import { useEmulatorStore } from '../../../store/emulatorStore'
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

describe('BPGameDetails', () => {
  let BPGameDetails: typeof import('../../../pages/bigpicture/BPGameDetails').default
  const mockSetIsNavFocused = vi.fn()

  beforeEach(async () => {
    vi.resetModules()
    clearGamepads()

    useLibraryStore.setState({
      games: [],
      toggleFavorite: vi.fn().mockResolvedValue(undefined),
      loadLibrary: vi.fn()
    })

    useEmulatorStore.setState({
      startGame: vi.fn().mockResolvedValue({ success: true })
    })

    useUIStore.setState({
      addToast: vi.fn()
    })

    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null
    })

    const module = await import('../../../pages/bigpicture/BPGameDetails')
    BPGameDetails = module.default
  })

  afterEach(() => {
    clearGamepads()
    mockSetIsNavFocused.mockClear()
  })

  function renderWithContext(gameId: string, isNavFocused = false) {
    return render(
      <MemoryRouter initialEntries={[`/bigpicture/game/${gameId}`]}>
        <Routes>
          <Route path="/bigpicture" element={
            <div>
              <Outlet context={{ isNavFocused, setIsNavFocused: mockSetIsNavFocused }} />
            </div>
          }>
            <Route path="game/:gameId" element={<BPGameDetails />} />
            <Route index element={<div data-testid="library">Library</div>} />
          </Route>
          <Route path="/play/:gameId" element={<div data-testid="play">Playing</div>} />
        </Routes>
      </MemoryRouter>
    )
  }

  describe('rendering', () => {
    it('displays game information', () => {
      const game = createMockGame({
        id: 'game-1',
        title: 'Super Mario Bros.',
        platform: 'nes',
        description: 'A classic platformer'
      })
      useLibraryStore.setState({ games: [game] })

      renderWithContext('game-1')

      expect(screen.getByText('Super Mario Bros.')).toBeInTheDocument()
      expect(screen.getByText('nes')).toBeInTheDocument()
      expect(screen.getByText('A classic platformer')).toBeInTheDocument()
    })

    it('shows game not found message for invalid ID', () => {
      renderWithContext('nonexistent-id')

      expect(screen.getByText('Game not found')).toBeInTheDocument()
    })

    it('shows play time', () => {
      const game = createMockGame({ id: 'game-1', playTime: 90 })
      useLibraryStore.setState({ games: [game] })

      renderWithContext('game-1')

      expect(screen.getByText('1h 30m')).toBeInTheDocument()
    })

    it('shows never played when no play time', () => {
      const game = createMockGame({ id: 'game-1', playTime: undefined })
      useLibraryStore.setState({ games: [game] })

      renderWithContext('game-1')

      expect(screen.getByText('Never played')).toBeInTheDocument()
    })

    it('shows favorite status', () => {
      const game = createMockGame({ id: 'game-1', isFavorite: true })
      useLibraryStore.setState({ games: [game] })

      renderWithContext('game-1')

      expect(screen.getByText('Favorited')).toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('play button starts game', async () => {
      const game = createMockGame({ id: 'game-1' })
      const startGame = vi.fn().mockResolvedValue({ success: true })
      useLibraryStore.setState({ games: [game] })
      useEmulatorStore.setState({ startGame })

      renderWithContext('game-1')

      const playButton = screen.getByRole('button', { name: /Play/i })
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(startGame).toHaveBeenCalledWith('game-1')
      })
    })

    it('shows error toast on launch failure', async () => {
      const game = createMockGame({ id: 'game-1' })
      const startGame = vi.fn().mockResolvedValue({ success: false, error: 'Launch failed' })
      const addToast = vi.fn()
      useLibraryStore.setState({ games: [game] })
      useEmulatorStore.setState({ startGame })
      useUIStore.setState({ addToast })

      renderWithContext('game-1')

      const playButton = screen.getByRole('button', { name: /Play/i })
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith('error', 'Launch failed')
      })
    })

    it('B button returns to previous screen', async () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })

      renderWithContext('game-1')

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

    it('Y button toggles favorite', async () => {
      const game = createMockGame({ id: 'game-1', isFavorite: false })
      const toggleFavorite = vi.fn().mockResolvedValue(undefined)
      useLibraryStore.setState({ games: [game], toggleFavorite })

      renderWithContext('game-1')

      const favoriteButton = screen.getByRole('button', { name: /Favorite/i })
      fireEvent.click(favoriteButton)

      await waitFor(() => {
        expect(toggleFavorite).toHaveBeenCalledWith('game-1')
      })
    })

    it('back button returns to library', async () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      renderWithContext('game-1')

      const backButton = screen.getByRole('button', { name: /Back/i })
      fireEvent.click(backButton)

      await waitFor(() => {
        expect(screen.getByTestId('library')).toBeInTheDocument()
      })
    })
  })

  describe('gamepad navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('A button on Play starts game', async () => {
      const game = createMockGame({ id: 'game-1' })
      const startGame = vi.fn().mockResolvedValue({ success: true })
      useLibraryStore.setState({ games: [game] })
      useEmulatorStore.setState({ startGame })

      renderWithContext('game-1')

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Play is focused by default
      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        expect(startGame).toHaveBeenCalledWith('game-1')
      })
    })

    it('left/right navigates between buttons', async () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      renderWithContext('game-1')

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Move left to Back button
      pressButton(0, BUTTON_INDICES.DPAD_LEFT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      const backButton = screen.getByRole('button', { name: /Back/i })
      expect(backButton).toHaveClass('bp-focus')
    })

    it('UP goes to nav tabs', async () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      renderWithContext('game-1')

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(mockSetIsNavFocused).toHaveBeenCalledWith(true)
    })
  })

  describe('focus indicator', () => {
    it('shows focus on play button by default', () => {
      const game = createMockGame({ id: 'game-1' })
      useLibraryStore.setState({ games: [game] })

      renderWithContext('game-1')

      const playButton = screen.getByRole('button', { name: /Play/i })
      expect(playButton).toHaveClass('bp-focus')
    })
  })

  describe('loading state', () => {
    it('shows loading state during launch', async () => {
      const game = createMockGame({ id: 'game-1' })
      let resolvePromise: (value: { success: boolean }) => void
      const startGame = vi.fn().mockReturnValue(
        new Promise(resolve => { resolvePromise = resolve })
      )
      useLibraryStore.setState({ games: [game] })
      useEmulatorStore.setState({ startGame })

      renderWithContext('game-1')

      const playButton = screen.getByRole('button', { name: /Play/i })
      fireEvent.click(playButton)

      await waitFor(() => {
        expect(screen.getByText('Launching...')).toBeInTheDocument()
      })

      resolvePromise!({ success: true })
    })
  })

  describe('loads library if empty', () => {
    it('calls loadLibrary when games array is empty', () => {
      const loadLibrary = vi.fn()
      useLibraryStore.setState({ games: [], loadLibrary })

      renderWithContext('game-1')

      expect(loadLibrary).toHaveBeenCalled()
    })
  })
})
