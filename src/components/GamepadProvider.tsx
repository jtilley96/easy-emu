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
    console.log('[GamepadProvider] Initializing...')
    const service = getGamepadService()

    // Set deadzone from settings
    service.setDeadzone(analogDeadzone)

    // Subscribe to gamepad updates
    const unsubscribe = service.subscribe((gamepads: GamepadState[]) => {
      // Only log when count changes to avoid spam
      if (gamepads.length !== lastGamepadCount.current) {
        console.log(`[GamepadProvider] Gamepads updated: ${gamepads.length} connected`)
        lastGamepadCount.current = gamepads.length
      }
      setGamepads(gamepads)

      // Auto-select first gamepad if none active
      const store = useInputStore.getState()
      if (store.activeGamepadIndex === null && gamepads.length > 0) {
        console.log(`[GamepadProvider] Auto-selecting gamepad: ${gamepads[0].name}`)
        setActiveGamepad(gamepads[0].index)
      }
    })

    // Listen for connection events
    const unsubscribeConnection = service.onConnection((gamepad, connected) => {
      console.log(`[GamepadProvider] Controller ${connected ? 'connected' : 'disconnected'}: ${gamepad.name}`)
      if (connected) {
        addToast('success', `Controller connected: ${gamepad.name}. Press Start for Big Picture mode`)
        // Auto-select new controller if none is active
        const store = useInputStore.getState()
        if (store.activeGamepadIndex === null) {
          console.log(`[GamepadProvider] Setting active gamepad to index ${gamepad.index}`)
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
      console.log(`[GamepadProvider] Found ${initialGamepads.length} initial gamepad(s)`)
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

  // Global gamepad shortcuts (work everywhere except during emulation)
  useEffect(() => {
    const service = getGamepadService()
    let animationFrameId: number
    let previousStartPressed = false
    let isProcessingStart = false  // Prevent multiple rapid presses

    const poll = () => {
      // Skip global shortcuts during emulation - let the emulator handle inputs
      const isInEmulator = window.location.hash.includes('/play/')
      if (isInEmulator) {
        previousStartPressed = false  // Reset state when entering emulator
        isProcessingStart = false
        animationFrameId = requestAnimationFrame(poll)
        return
      }

      // Get gamepads directly from service (more reliable than store which may lag)
      const gamepads = service.getGamepads()
      if (gamepads.length === 0) {
        previousStartPressed = false
        isProcessingStart = false
        animationFrameId = requestAnimationFrame(poll)
        return
      }

      // Use first available gamepad
      const gamepad = gamepads[0]
      const store = useInputStore.getState()
      const { setBigPictureMode, setActiveGamepad, activeGamepadIndex } = store

      // Ensure activeGamepadIndex is set
      if (activeGamepadIndex === null) {
        setActiveGamepad(gamepad.index)
      }

      // Check for Start button to toggle Big Picture - use local just-pressed tracking
      const startPressed = service.isActionPressed(gamepad.index, 'start')

      // Only trigger on button down (not held) and if not already processing
      if (startPressed && !previousStartPressed && !isProcessingStart) {
        // Determine current mode from route, not store (store may be stale)
        const currentHash = window.location.hash
        const isCurrentlyInBigPicture = currentHash.includes('/bigpicture')
        const newMode = !isCurrentlyInBigPicture
        
        console.log('[GamepadProvider] Start pressed - toggling Big Picture mode', { isCurrentlyInBigPicture, newMode })
        isProcessingStart = true
        
        // Update state and navigate immediately using the computed newMode
        setBigPictureMode(newMode)
        
        // Navigate immediately based on computed newMode
        if (newMode) {
          window.location.hash = '#/bigpicture'
        } else {
          window.location.hash = '#/'
        }
        
        // Reset previousStartPressed immediately to prevent double-trigger
        previousStartPressed = true
        
        // Reset processing flag after a short delay to allow navigation to complete
        setTimeout(() => {
          isProcessingStart = false
        }, 200)
      } else if (!startPressed) {
        // Button released - reset tracking
        previousStartPressed = false
        isProcessingStart = false
      } else {
        // Button still held - keep previousStartPressed true
        previousStartPressed = startPressed
      }
      
      animationFrameId = requestAnimationFrame(poll)
    }

    animationFrameId = requestAnimationFrame(poll)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <>{children}</>
}
