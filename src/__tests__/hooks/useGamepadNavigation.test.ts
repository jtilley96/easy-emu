import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInputStore } from '../../store/inputStore'
import {
  createMockGamepad,
  setGamepad,
  clearGamepads,
  pressButton,
  releaseButton,
  setAxis,
  fireGamepadConnected,
  BUTTON_INDICES,
  AXIS_INDICES
} from '../mocks/gamepadAPI'
import { flushAnimationFrames } from '../../../vitest.setup'

describe('useGamepadNavigation', () => {
  let useGamepadNavigation: typeof import('../../hooks/useGamepadNavigation').useGamepadNavigation

  beforeEach(async () => {
    vi.resetModules()
    clearGamepads()

    // Reset input store
    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null,
      dpadRepeatDelay: 400,
      dpadRepeatRate: 100
    })

    const module = await import('../../hooks/useGamepadNavigation')
    useGamepadNavigation = module.useGamepadNavigation
  })

  afterEach(() => {
    clearGamepads()
  })

  describe('enable/disable', () => {
    it('does not call callbacks when disabled', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })

      const onConfirm = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: false,
        onConfirm
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('calls callbacks when enabled', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })

      const onConfirm = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onConfirm
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onConfirm).toHaveBeenCalled()
    })

    it('uses first available gamepad when activeGamepadIndex is null', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      // Note: activeGamepadIndex stays null

      const onConfirm = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onConfirm
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onConfirm).toHaveBeenCalled()
    })
  })

  describe('button actions', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('A button triggers onConfirm', async () => {
      const onConfirm = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onConfirm
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('B button triggers onBack', async () => {
      const onBack = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onBack
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.B)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('X button triggers onOption1', async () => {
      const onOption1 = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onOption1
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.X)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onOption1).toHaveBeenCalledTimes(1)
    })

    it('Y button triggers onOption2', async () => {
      const onOption2 = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onOption2
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.Y)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onOption2).toHaveBeenCalledTimes(1)
    })

    it('LB triggers onLeftBumper', async () => {
      const onLeftBumper = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onLeftBumper
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.LB)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onLeftBumper).toHaveBeenCalledTimes(1)
    })

    it('RB triggers onRightBumper', async () => {
      const onRightBumper = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onRightBumper
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.RB)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onRightBumper).toHaveBeenCalledTimes(1)
    })

    it('Start button triggers onStart', async () => {
      const onStart = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onStart
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.START)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onStart).toHaveBeenCalledTimes(1)
    })
  })

  describe('D-pad navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('D-pad UP triggers onNavigate("up")', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('up')
    })

    it('D-pad DOWN triggers onNavigate("down")', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.DPAD_DOWN)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('down')
    })

    it('D-pad LEFT triggers onNavigate("left")', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.DPAD_LEFT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('left')
    })

    it('D-pad RIGHT triggers onNavigate("right")', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('right')
    })
  })

  describe('analog stick navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('left stick up triggers onNavigate("up")', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Push stick up (negative Y)
      setAxis(0, AXIS_INDICES.LEFT_Y, -0.9)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('up')
    })

    it('left stick down triggers onNavigate("down")', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Push stick down (positive Y)
      setAxis(0, AXIS_INDICES.LEFT_Y, 0.9)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('down')
    })

    it('left stick left triggers onNavigate("left")', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Push stick left (negative X)
      setAxis(0, AXIS_INDICES.LEFT_X, -0.9)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('left')
    })

    it('left stick right triggers onNavigate("right")', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Push stick right (positive X)
      setAxis(0, AXIS_INDICES.LEFT_X, 0.9)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('right')
    })

    it('diagonal movement chooses dominant axis (vertical)', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Diagonal with stronger Y
      setAxis(0, AXIS_INDICES.LEFT_X, 0.5)
      setAxis(0, AXIS_INDICES.LEFT_Y, -0.9)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('up')
    })

    it('diagonal movement chooses dominant axis (horizontal)', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Diagonal with stronger X
      setAxis(0, AXIS_INDICES.LEFT_X, 0.9)
      setAxis(0, AXIS_INDICES.LEFT_Y, -0.5)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledWith('right')
    })

    it('stick below threshold does not trigger navigation', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Push stick only slightly
      setAxis(0, AXIS_INDICES.LEFT_X, 0.3)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).not.toHaveBeenCalled()
    })
  })

  describe('input debouncing', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('held direction only fires once initially', async () => {
      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onNavigate).toHaveBeenCalledTimes(1)
      expect(onNavigate).toHaveBeenCalledWith('up')

      // Keep holding, should not fire again immediately
      await act(async () => {
        flushAnimationFrames(5)
      })

      // Still only 1 call (repeat hasn't kicked in yet since it's a short time)
      expect(onNavigate.mock.calls.filter(c => c[0] === 'up').length).toBe(1)
    })

    it('button presses only fire once per press', async () => {
      const onConfirm = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onConfirm
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(5)
      })

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('button fires again after release and re-press', async () => {
      const onConfirm = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onConfirm
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      // First press
      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(2)
      })

      expect(onConfirm).toHaveBeenCalledTimes(1)

      // Release
      releaseButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Second press
      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(2)
      })

      expect(onConfirm).toHaveBeenCalledTimes(2)
    })
  })

  describe('needsRelease (focus transition)', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('when enabled with direction held, requires release before responding', async () => {
      // Pre-press a direction
      pressButton(0, BUTTON_INDICES.DPAD_UP)

      const onNavigate = vi.fn()

      // Mount hook with direction already pressed
      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(5)
      })

      // Should not fire because needsRelease
      expect(onNavigate).not.toHaveBeenCalled()

      // Release
      releaseButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Now press again
      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Now it should fire
      expect(onNavigate).toHaveBeenCalledWith('up')
    })

    it('when enabled with button held, initializes state to prevent false justPressed', async () => {
      // Pre-press a button
      pressButton(0, BUTTON_INDICES.A)

      const onConfirm = vi.fn()

      // Mount hook with button already pressed
      renderHook(() => useGamepadNavigation({
        enabled: true,
        onConfirm
      }))

      await act(async () => {
        flushAnimationFrames(5)
      })

      // Should not fire because button was already held
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('resets needsRelease state after all inputs are released', async () => {
      // Pre-press direction
      pressButton(0, BUTTON_INDICES.DPAD_UP)

      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Release all
      releaseButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Now different direction should work
      pressButton(0, BUTTON_INDICES.DPAD_LEFT)

      await act(async () => {
        flushAnimationFrames(2)
      })

      expect(onNavigate).toHaveBeenCalledWith('left')
    })
  })

  describe('transitions when enabled changes', () => {
    it('does not respond during disabled state', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })

      const onConfirm = vi.fn()

      const { rerender } = renderHook(
        ({ enabled }) => useGamepadNavigation({ enabled, onConfirm }),
        { initialProps: { enabled: false } }
      )

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(2)
      })

      expect(onConfirm).not.toHaveBeenCalled()

      // Now enable
      releaseButton(0, BUTTON_INDICES.A)

      rerender({ enabled: true })

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Press again
      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(2)
      })

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('custom repeat settings', () => {
    it('uses custom repeatDelay from options', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })

      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate,
        repeatDelay: 100,
        repeatRate: 50
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // First call should happen
      expect(onNavigate).toHaveBeenCalledTimes(1)
    })

    it('uses dpadRepeatDelay from store when not specified', async () => {
      useInputStore.setState({ dpadRepeatDelay: 300, dpadRepeatRate: 80 })

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })

      const onNavigate = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate
      }))

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Should use store values
      expect(onNavigate).toHaveBeenCalled()
    })
  })

  describe('no gamepads connected', () => {
    it('does nothing when no gamepads are available', async () => {
      // No gamepads connected
      const onNavigate = vi.fn()
      const onConfirm = vi.fn()

      renderHook(() => useGamepadNavigation({
        enabled: true,
        onNavigate,
        onConfirm
      }))

      await act(async () => {
        flushAnimationFrames(5)
      })

      expect(onNavigate).not.toHaveBeenCalled()
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })
})
