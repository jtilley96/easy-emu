import { useEffect, useRef } from 'react'
import { getGamepadService, GamepadState } from '../services/gamepadService'
import { useInputStore } from '../store/inputStore'
import { useUIStore } from '../store/uiStore'

/**
 * Global provider component that initializes the gamepad service
 * and syncs gamepad state to the store.
 *
 * This must be rendered at the app root level.
 */
export default function GamepadProvider({ children }: { children: React.ReactNode }) {
  const { setGamepads, setActiveGamepad, analogDeadzone } = useInputStore()
  const { addToast } = useUIStore()
  const lastGamepadCount = useRef(0)

  useEffect(() => {
    const service = getGamepadService()

    // Set deadzone from settings
    service.setDeadzone(analogDeadzone)

    // Subscribe to gamepad updates
    const unsubscribe = service.subscribe((gamepads: GamepadState[]) => {
      // Only log when count changes to avoid spam
      if (gamepads.length !== lastGamepadCount.current) {
        lastGamepadCount.current = gamepads.length
      }
      setGamepads(gamepads)

      // Auto-select first gamepad if none active
      const store = useInputStore.getState()
      if (store.activeGamepadIndex === null && gamepads.length > 0) {
        setActiveGamepad(gamepads[0].index)
      }
    })

    // Listen for connection events
    const unsubscribeConnection = service.onConnection((gamepad, connected) => {
      if (connected) {
        addToast('success', `Controller connected: ${gamepad.name}`)
        // Auto-select new controller if none is active
        const store = useInputStore.getState()
        if (store.activeGamepadIndex === null) {
          setActiveGamepad(gamepad.index)
        }
      } else {
        addToast('info', `Controller disconnected: ${gamepad.name}`)
      }
    })

    // Initial poll to detect already-connected gamepads
    // Note: Gamepads are only visible to the browser after user interaction (button press)
    const initialGamepads = service.getGamepads()
    if (initialGamepads.length > 0) {
      setGamepads(initialGamepads)
      setActiveGamepad(initialGamepads[0].index)
    }

    return () => {
      unsubscribe()
      unsubscribeConnection()
    }
  }, [setGamepads, setActiveGamepad, analogDeadzone])

  // Update deadzone when setting changes
  useEffect(() => {
    const service = getGamepadService()
    service.setDeadzone(analogDeadzone)
  }, [analogDeadzone])

  return <>{children}</>
}
