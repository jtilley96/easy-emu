import { useState, useEffect, useCallback } from 'react'
import { getGamepadService, GamepadState, ButtonAction } from '../services/gamepadService'
import { useInputStore } from '../store/inputStore'

/**
 * Low-level hook exposing gamepad state
 */
export function useGamepad() {
  const [gamepads, setGamepads] = useState<GamepadState[]>([])
  const { activeGamepadIndex, setGamepads: updateStoreGamepads } = useInputStore()

  useEffect(() => {
    const service = getGamepadService()

    // Initial state
    setGamepads(service.getGamepads())

    // Subscribe to updates
    const unsubscribe = service.subscribe((newGamepads) => {
      setGamepads(newGamepads)
      updateStoreGamepads(newGamepads)
    })

    return () => {
      unsubscribe()
    }
  }, [updateStoreGamepads])

  const activeGamepad = gamepads.find(g => g.index === activeGamepadIndex) ?? null

  const isActionPressed = useCallback((action: ButtonAction): boolean => {
    if (activeGamepadIndex === null) return false
    return getGamepadService().isActionPressed(activeGamepadIndex, action)
  }, [activeGamepadIndex])

  const isActionJustPressed = useCallback((action: ButtonAction): boolean => {
    if (activeGamepadIndex === null) return false
    return getGamepadService().isActionJustPressed(activeGamepadIndex, action)
  }, [activeGamepadIndex])

  const getLeftStick = useCallback(() => {
    if (activeGamepadIndex === null) return { x: 0, y: 0 }
    return getGamepadService().getLeftStick(activeGamepadIndex)
  }, [activeGamepadIndex])

  const getRightStick = useCallback(() => {
    if (activeGamepadIndex === null) return { x: 0, y: 0 }
    return getGamepadService().getRightStick(activeGamepadIndex)
  }, [activeGamepadIndex])

  return {
    gamepads,
    activeGamepad,
    activeGamepadIndex,
    isActionPressed,
    isActionJustPressed,
    getLeftStick,
    getRightStick
  }
}

export default useGamepad
