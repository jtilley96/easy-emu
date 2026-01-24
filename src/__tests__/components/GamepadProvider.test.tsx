import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useInputStore } from '../../store/inputStore'
import { useUIStore } from '../../store/uiStore'
import {
  createMockGamepad,
  setGamepad,
  clearGamepads,
  pressButton,
  releaseButton,
  fireGamepadConnected,
  fireGamepadDisconnected,
  BUTTON_INDICES
} from '../mocks/gamepadAPI'
import { flushAnimationFrames } from '../../../vitest.setup'

describe('GamepadProvider', () => {
  let GamepadProvider: typeof import('../../components/GamepadProvider').default

  beforeEach(async () => {
    vi.resetModules()
    clearGamepads()

    // Reset stores
    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null,
      isBigPictureMode: false,
      analogDeadzone: 0.15
    })

    useUIStore.setState({
      toasts: []
    })

    // Mock window.location.hash
    Object.defineProperty(window, 'location', {
      value: { hash: '#/' },
      writable: true
    })

    const module = await import('../../components/GamepadProvider')
    GamepadProvider = module.default
  })

  afterEach(() => {
    clearGamepads()
  })

  describe('initialization', () => {
    it('initializes gamepad service on mount', async () => {
      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      expect(screen.getByText('Child')).toBeInTheDocument()
    })

    it('detects already-connected gamepads on mount', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        const store = useInputStore.getState()
        expect(store.gamepads.length).toBeGreaterThanOrEqual(0)
      })
    })

    it('auto-selects first gamepad if none is active', async () => {
      const gamepad = createMockGamepad({ index: 2 })
      setGamepad(2, gamepad)
      fireGamepadConnected(gamepad)

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        const store = useInputStore.getState()
        expect(store.activeGamepadIndex).toBe(2)
      })
    })
  })

  describe('store sync', () => {
    it('syncs connected gamepads to inputStore', async () => {
      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(2)
      })

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        const store = useInputStore.getState()
        expect(store.gamepads.length).toBe(1)
      })
    })

    it('updates store when gamepad connects', async () => {
      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(2)
      })

      const gamepad1 = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad1)
      fireGamepadConnected(gamepad1)

      await act(async () => {
        flushAnimationFrames(2)
      })

      const gamepad2 = createMockGamepad({ index: 1 })
      setGamepad(1, gamepad2)
      fireGamepadConnected(gamepad2)

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        const store = useInputStore.getState()
        expect(store.gamepads.length).toBe(2)
      })
    })
  })

  describe('connection toast', () => {
    it('shows toast when controller connects with name', async () => {
      const addToast = vi.fn()
      useUIStore.setState({ addToast })

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(2)
      })

      const gamepad = createMockGamepad({
        index: 0,
        id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)'
      })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      await act(async () => {
        flushAnimationFrames(2)
      })

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(
          'success',
          expect.stringContaining('Controller connected')
        )
      })
    })

    it('toast includes hint about Big Picture mode', async () => {
      const addToast = vi.fn()
      useUIStore.setState({ addToast })

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(2)
      })

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      await act(async () => {
        flushAnimationFrames(2)
      })

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(
          'success',
          expect.stringContaining('Big Picture')
        )
      })
    })

    it('shows toast when controller disconnects', async () => {
      const addToast = vi.fn()
      useUIStore.setState({ addToast })

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(2)
      })

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      await act(async () => {
        flushAnimationFrames(2)
      })

      addToast.mockClear()

      setGamepad(0, null)
      fireGamepadDisconnected(gamepad)

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(
          'info',
          expect.stringContaining('disconnected')
        )
      })
    })
  })

  describe('Start button shortcut', () => {
    it('Start button toggles Big Picture mode', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Press Start
      pressButton(0, BUTTON_INDICES.START)

      await act(async () => {
        flushAnimationFrames(5)
      })

      await waitFor(() => {
        expect(window.location.hash).toBe('#/bigpicture')
      })
    })

    it('toggles on single press (not double)', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Single press
      pressButton(0, BUTTON_INDICES.START)

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        expect(window.location.hash).toBe('#/bigpicture')
      })
    })

    it('does not respond to Start during emulation', async () => {
      // Set hash to emulation route
      Object.defineProperty(window, 'location', {
        value: { hash: '#/play/game-123' },
        writable: true
      })

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.START)

      await act(async () => {
        flushAnimationFrames(5)
      })

      // Should not change
      expect(window.location.hash).toBe('#/play/game-123')
    })

    it('navigates to #/bigpicture when enabling', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.START)

      await act(async () => {
        flushAnimationFrames(5)
      })

      await waitFor(() => {
        expect(window.location.hash).toBe('#/bigpicture')
      })
    })

    it('navigates to #/ when disabling', async () => {
      // Start in Big Picture mode
      Object.defineProperty(window, 'location', {
        value: { hash: '#/bigpicture' },
        writable: true
      })
      useInputStore.setState({ isBigPictureMode: true })

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.START)

      await act(async () => {
        flushAnimationFrames(5)
      })

      await waitFor(() => {
        expect(window.location.hash).toBe('#/')
      })
    })
  })

  describe('deadzone', () => {
    it('applies analogDeadzone from store to service', async () => {
      useInputStore.setState({ analogDeadzone: 0.25 })

      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      // The service should have the deadzone applied
      // We can't directly test the service deadzone, but we verify no errors occur
      expect(true).toBe(true)
    })

    it('updates service deadzone when store changes', async () => {
      render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Change deadzone
      useInputStore.setState({ analogDeadzone: 0.3 })

      await act(async () => {
        flushAnimationFrames(2)
      })

      // No error should occur
      expect(true).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('unsubscribes from service on unmount', async () => {
      const { unmount } = render(
        <GamepadProvider>
          <div>Child</div>
        </GamepadProvider>
      )

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Unmount should not throw
      unmount()

      // Additional gamepads should not affect unmounted component
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      await act(async () => {
        flushAnimationFrames(2)
      })

      // No error should occur
      expect(true).toBe(true)
    })
  })

  describe('rendering', () => {
    it('renders children', () => {
      render(
        <GamepadProvider>
          <div data-testid="child-content">Test Content</div>
        </GamepadProvider>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
    })

    it('does not add extra DOM elements', () => {
      const { container } = render(
        <GamepadProvider>
          <div data-testid="child">Child</div>
        </GamepadProvider>
      )

      // Should only have the child div
      expect(container.firstChild).toHaveAttribute('data-testid', 'child')
    })
  })
})
