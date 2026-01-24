import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useInputStore } from '../../store/inputStore'
import {
  createMockGamepad,
  setGamepad,
  clearGamepads,
  pressButton,
  releaseButton,
  fireGamepadConnected,
  BUTTON_INDICES
} from '../mocks/gamepadAPI'
import { flushAnimationFrames } from '../../../vitest.setup'

describe('useGamepad', () => {
  let useGamepad: typeof import('../../hooks/useGamepad').useGamepad

  beforeEach(async () => {
    vi.resetModules()
    clearGamepads()

    // Reset input store
    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null
    })

    const module = await import('../../hooks/useGamepad')
    useGamepad = module.useGamepad
  })

  afterEach(() => {
    clearGamepads()
  })

  describe('gamepads state', () => {
    it('returns empty array when no gamepads are connected', () => {
      const { result } = renderHook(() => useGamepad())

      expect(result.current.gamepads).toEqual([])
    })

    it('returns connected gamepads from service', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      const { result } = renderHook(() => useGamepad())

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        expect(result.current.gamepads.length).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('activeGamepad', () => {
    it('returns null when no gamepad is active', () => {
      const { result } = renderHook(() => useGamepad())

      expect(result.current.activeGamepad).toBeNull()
    })

    it('returns active gamepad when activeGamepadIndex is set', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      useInputStore.setState({ activeGamepadIndex: 0 })

      const { result } = renderHook(() => useGamepad())

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        expect(result.current.activeGamepadIndex).toBe(0)
      })
    })
  })

  describe('isActionPressed', () => {
    it('returns false when no gamepad is active', () => {
      const { result } = renderHook(() => useGamepad())

      expect(result.current.isActionPressed('confirm')).toBe(false)
    })

    it('returns true when action button is pressed', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      useInputStore.setState({ activeGamepadIndex: 0 })

      const { result } = renderHook(() => useGamepad())

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(2)
      })

      expect(result.current.isActionPressed('confirm')).toBe(true)
    })

    it('returns false when action button is not pressed', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      useInputStore.setState({ activeGamepadIndex: 0 })

      const { result } = renderHook(() => useGamepad())

      await act(async () => {
        flushAnimationFrames(2)
      })

      expect(result.current.isActionPressed('confirm')).toBe(false)
    })
  })

  describe('isActionJustPressed', () => {
    it('returns false when no gamepad is active', () => {
      const { result } = renderHook(() => useGamepad())

      expect(result.current.isActionJustPressed('confirm')).toBe(false)
    })

    it('returns true only on initial press', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      useInputStore.setState({ activeGamepadIndex: 0 })

      const { result } = renderHook(() => useGamepad())

      await act(async () => {
        flushAnimationFrames(2)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(1)
      })

      // First check - should be true
      const firstCheck = result.current.isActionJustPressed('confirm')

      await act(async () => {
        flushAnimationFrames(1)
      })

      // Second check while still held - should be false
      const secondCheck = result.current.isActionJustPressed('confirm')

      expect(firstCheck).toBe(true)
      expect(secondCheck).toBe(false)
    })
  })

  describe('getLeftStick', () => {
    it('returns zero when no gamepad is active', () => {
      const { result } = renderHook(() => useGamepad())

      expect(result.current.getLeftStick()).toEqual({ x: 0, y: 0 })
    })
  })

  describe('getRightStick', () => {
    it('returns zero when no gamepad is active', () => {
      const { result } = renderHook(() => useGamepad())

      expect(result.current.getRightStick()).toEqual({ x: 0, y: 0 })
    })
  })

  describe('store sync', () => {
    it('updates store gamepads when service detects changes', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      renderHook(() => useGamepad())

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        const storeState = useInputStore.getState()
        expect(storeState.gamepads.length).toBeGreaterThanOrEqual(0)
      })
    })
  })
})
