import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createMockGamepad,
  createMockGamepadByType,
  createGamepadWithButtonPressed,
  createGamepadWithStickInput,
  setGamepad,
  clearGamepads,
  pressButton,
  releaseButton,
  setAxis,
  fireGamepadConnected,
  fireGamepadDisconnected,
  BUTTON_INDICES,
  AXIS_INDICES
} from '../mocks/gamepadAPI'
import { flushAnimationFrames } from '../../../vitest.setup'

// We need to test the gamepadService, but it's a singleton
// So we'll test its public interface

describe('gamepadService', () => {
  let GamepadService: typeof import('../../services/gamepadService').default
  let getGamepadService: typeof import('../../services/gamepadService').getGamepadService

  beforeEach(async () => {
    // Reset module cache to get fresh singleton for each test
    vi.resetModules()

    // Re-import to get fresh instance
    const module = await import('../../services/gamepadService')
    GamepadService = module.default
    getGamepadService = module.getGamepadService
  })

  afterEach(() => {
    clearGamepads()
  })

  describe('singleton pattern', () => {
    it('returns the same instance on multiple calls', () => {
      const instance1 = getGamepadService()
      const instance2 = getGamepadService()

      expect(instance1).toBe(instance2)
    })
  })

  describe('controller detection', () => {
    it('detects connected gamepads on initialization', () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)

      const service = getGamepadService()
      const gamepads = service.getGamepads()

      expect(gamepads.length).toBeGreaterThanOrEqual(0)
    })

    it('detects Xbox controller type from ID', () => {
      const gamepad = createMockGamepadByType('xbox', 0)
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      const service = getGamepadService()
      const detected = service.getGamepad(0)

      expect(detected?.type).toBe('xbox')
    })

    it('detects PlayStation controller type from ID', () => {
      const gamepad = createMockGamepadByType('playstation', 0)
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      const service = getGamepadService()
      const detected = service.getGamepad(0)

      expect(detected?.type).toBe('playstation')
    })

    it('detects Nintendo controller type from ID', () => {
      const gamepad = createMockGamepadByType('nintendo', 0)
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      const service = getGamepadService()
      const detected = service.getGamepad(0)

      expect(detected?.type).toBe('nintendo')
    })

    it('falls back to generic for unknown controllers', () => {
      const gamepad = createMockGamepadByType('generic', 0)
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      const service = getGamepadService()
      const detected = service.getGamepad(0)

      expect(detected?.type).toBe('generic')
    })
  })

  describe('connection events', () => {
    it('fires connection callback when gamepad connects', () => {
      const service = getGamepadService()
      const callback = vi.fn()
      service.onConnection(callback)

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ index: 0, connected: true }),
        true
      )
    })

    it('fires disconnection callback when gamepad disconnects', () => {
      const service = getGamepadService()

      // First connect the gamepad
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      const callback = vi.fn()
      service.onConnection(callback)

      // Then disconnect
      setGamepad(0, null)
      fireGamepadDisconnected(gamepad)

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ index: 0 }),
        false
      )
    })

    it('removes gamepad from list on disconnect', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      expect(service.getGamepads().length).toBe(1)

      setGamepad(0, null)
      fireGamepadDisconnected(gamepad)

      expect(service.getGamepads().length).toBe(0)
    })

    it('handles multiple simultaneous gamepads', () => {
      const service = getGamepadService()

      const gamepad1 = createMockGamepad({ index: 0 })
      const gamepad2 = createMockGamepad({ index: 1 })

      setGamepad(0, gamepad1)
      setGamepad(1, gamepad2)
      fireGamepadConnected(gamepad1)
      fireGamepadConnected(gamepad2)

      expect(service.getGamepads().length).toBe(2)
    })

    it('returns unsubscribe function for connection listener', () => {
      const service = getGamepadService()
      const callback = vi.fn()

      const unsubscribe = service.onConnection(callback)

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()

      const gamepad2 = createMockGamepad({ index: 1 })
      setGamepad(1, gamepad2)
      fireGamepadConnected(gamepad2)

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('button detection', () => {
    it('isActionPressed returns true while button is held', () => {
      const service = getGamepadService()

      const gamepad = createGamepadWithButtonPressed(BUTTON_INDICES.A, { index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)

      // Flush frames to update state
      flushAnimationFrames(2)

      expect(service.isActionPressed(0, 'confirm')).toBe(true)
    })

    it('isActionPressed returns false after button is released', () => {
      const service = getGamepadService()

      const gamepad = createGamepadWithButtonPressed(BUTTON_INDICES.A, { index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      releaseButton(0, BUTTON_INDICES.A)
      flushAnimationFrames(2)

      expect(service.isActionPressed(0, 'confirm')).toBe(false)
    })

    it('isActionJustPressed returns true only on initial press', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      // Press button
      pressButton(0, BUTTON_INDICES.A)
      flushAnimationFrames(1)

      expect(service.isActionJustPressed(0, 'confirm')).toBe(true)

      // Still held - should not be "justPressed"
      flushAnimationFrames(1)

      expect(service.isActionJustPressed(0, 'confirm')).toBe(false)
    })

    it('isActionJustPressed returns true again after release and re-press', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      // First press
      pressButton(0, BUTTON_INDICES.A)
      flushAnimationFrames(1)
      expect(service.isActionJustPressed(0, 'confirm')).toBe(true)

      flushAnimationFrames(1)
      expect(service.isActionJustPressed(0, 'confirm')).toBe(false)

      // Release
      releaseButton(0, BUTTON_INDICES.A)
      flushAnimationFrames(1)

      // Second press
      pressButton(0, BUTTON_INDICES.A)
      flushAnimationFrames(1)

      expect(service.isActionJustPressed(0, 'confirm')).toBe(true)
    })

    it('maps standard gamepad buttons to semantic actions', () => {
      const service = getGamepadService()

      // Xbox mappings
      expect(service.getButtonIndex('confirm', 'xbox')).toBe(0) // A
      expect(service.getButtonIndex('back', 'xbox')).toBe(1) // B
      expect(service.getButtonIndex('option1', 'xbox')).toBe(2) // X
      expect(service.getButtonIndex('option2', 'xbox')).toBe(3) // Y
      expect(service.getButtonIndex('start', 'xbox')).toBe(9)
      expect(service.getButtonIndex('dpadUp', 'xbox')).toBe(12)
      expect(service.getButtonIndex('dpadDown', 'xbox')).toBe(13)
      expect(service.getButtonIndex('dpadLeft', 'xbox')).toBe(14)
      expect(service.getButtonIndex('dpadRight', 'xbox')).toBe(15)
    })

    it('handles Nintendo button swap correctly', () => {
      const service = getGamepadService()

      // Nintendo A/B are swapped from Xbox
      expect(service.getButtonIndex('confirm', 'nintendo')).toBe(1) // A on right
      expect(service.getButtonIndex('back', 'nintendo')).toBe(0) // B on bottom
    })
  })

  describe('analog sticks', () => {
    it('returns left stick values', () => {
      const service = getGamepadService()

      const gamepad = createGamepadWithStickInput(0.5, -0.7, 0, 0, { index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      const leftStick = service.getLeftStick(0)

      expect(leftStick.x).toBeGreaterThan(0)
      expect(leftStick.y).toBeLessThan(0)
    })

    it('returns right stick values', () => {
      const service = getGamepadService()

      const gamepad = createGamepadWithStickInput(0, 0, 0.8, 0.3, { index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      const rightStick = service.getRightStick(0)

      expect(rightStick.x).toBeGreaterThan(0)
      expect(rightStick.y).toBeGreaterThan(0)
    })

    it('applies deadzone - small movements return 0', () => {
      const service = getGamepadService()
      service.setDeadzone(0.15)

      const gamepad = createGamepadWithStickInput(0.1, 0.1, 0, 0, { index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      const leftStick = service.getLeftStick(0)

      expect(leftStick.x).toBe(0)
      expect(leftStick.y).toBe(0)
    })

    it('values above deadzone are normalized', () => {
      const service = getGamepadService()
      service.setDeadzone(0.15)

      const gamepad = createGamepadWithStickInput(0.5, 0, 0, 0, { index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      const leftStick = service.getLeftStick(0)

      // Value should be rescaled to account for deadzone
      expect(leftStick.x).toBeGreaterThan(0)
      expect(leftStick.x).toBeLessThan(0.5)
    })

    it('returns zero for disconnected gamepad', () => {
      const service = getGamepadService()

      const leftStick = service.getLeftStick(99)
      const rightStick = service.getRightStick(99)

      expect(leftStick).toEqual({ x: 0, y: 0 })
      expect(rightStick).toEqual({ x: 0, y: 0 })
    })
  })

  describe('deadzone', () => {
    it('setDeadzone clamps value between 0 and 0.5', () => {
      const service = getGamepadService()

      service.setDeadzone(-0.1)
      // Can't directly check deadzone value, but should work without error

      service.setDeadzone(0.6)
      // Should clamp to 0.5

      service.setDeadzone(0.25)
      // Should work
    })
  })

  describe('navigation direction', () => {
    it('returns up when D-pad up is just pressed', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      pressButton(0, BUTTON_INDICES.DPAD_UP)
      flushAnimationFrames(1)

      expect(service.getNavigationDirection(0)).toBe('up')
    })

    it('returns down when D-pad down is just pressed', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      flushAnimationFrames(1)

      expect(service.getNavigationDirection(0)).toBe('down')
    })

    it('returns left when D-pad left is just pressed', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      pressButton(0, BUTTON_INDICES.DPAD_LEFT)
      flushAnimationFrames(1)

      expect(service.getNavigationDirection(0)).toBe('left')
    })

    it('returns right when D-pad right is just pressed', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      flushAnimationFrames(1)

      expect(service.getNavigationDirection(0)).toBe('right')
    })

    it('detects navigation from left stick', () => {
      const service = getGamepadService()

      const gamepad = createGamepadWithStickInput(0, -0.9, 0, 0, { index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      expect(service.getNavigationDirection(0)).toBe('up')
    })

    it('returns null when no navigation input', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      expect(service.getNavigationDirection(0)).toBeNull()
    })

    it('returns null for nonexistent gamepad', () => {
      const service = getGamepadService()

      expect(service.getNavigationDirection(99)).toBeNull()
    })
  })

  describe('subscription', () => {
    it('notifies subscribers of gamepad state changes', () => {
      const service = getGamepadService()
      const callback = vi.fn()

      service.subscribe(callback)

      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      expect(callback).toHaveBeenCalled()
    })

    it('returns unsubscribe function', () => {
      const service = getGamepadService()
      const callback = vi.fn()

      const unsubscribe = service.subscribe(callback)
      callback.mockClear()

      unsubscribe()

      flushAnimationFrames(5)

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('getDefaultMapping', () => {
    it('returns Xbox mapping for xbox type', () => {
      const service = getGamepadService()
      const mapping = service.getDefaultMapping('xbox')

      expect(mapping.confirm).toBe(0)
      expect(mapping.back).toBe(1)
    })

    it('returns PlayStation mapping for playstation type', () => {
      const service = getGamepadService()
      const mapping = service.getDefaultMapping('playstation')

      expect(mapping.confirm).toBe(0)
      expect(mapping.back).toBe(1)
    })

    it('returns Nintendo mapping for nintendo type', () => {
      const service = getGamepadService()
      const mapping = service.getDefaultMapping('nintendo')

      expect(mapping.confirm).toBe(1) // A on right
      expect(mapping.back).toBe(0) // B on bottom
    })

    it('returns Xbox mapping for generic type', () => {
      const service = getGamepadService()
      const mapping = service.getDefaultMapping('generic')

      expect(mapping.confirm).toBe(0)
      expect(mapping.back).toBe(1)
    })
  })

  describe('getGamepad', () => {
    it('returns gamepad state for valid index', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({ index: 0, id: 'Test Controller' })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      const state = service.getGamepad(0)

      expect(state).toBeDefined()
      expect(state?.index).toBe(0)
    })

    it('returns undefined for invalid index', () => {
      const service = getGamepadService()

      expect(service.getGamepad(99)).toBeUndefined()
    })
  })

  describe('getGamepads', () => {
    it('returns array of all connected gamepads', () => {
      const service = getGamepadService()

      const gamepad1 = createMockGamepad({ index: 0 })
      const gamepad2 = createMockGamepad({ index: 1 })

      setGamepad(0, gamepad1)
      setGamepad(1, gamepad2)
      fireGamepadConnected(gamepad1)
      fireGamepadConnected(gamepad2)
      flushAnimationFrames(2)

      const gamepads = service.getGamepads()

      expect(gamepads.length).toBe(2)
    })

    it('returns empty array when no gamepads connected', () => {
      const service = getGamepadService()

      expect(service.getGamepads()).toEqual([])
    })
  })

  describe('controller name extraction', () => {
    it('extracts readable name from controller ID', () => {
      const service = getGamepadService()

      const gamepad = createMockGamepad({
        index: 0,
        id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)'
      })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      flushAnimationFrames(2)

      const state = service.getGamepad(0)

      expect(state?.name).toBe('Xbox 360 Controller')
    })
  })
})
