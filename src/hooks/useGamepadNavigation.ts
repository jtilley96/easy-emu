import { useEffect, useRef, useCallback } from 'react'
import { getGamepadService, ButtonAction } from '../services/gamepadService'
import { useInputStore } from '../store/inputStore'

export type NavigationDirection = 'up' | 'down' | 'left' | 'right'

export interface UseGamepadNavigationOptions {
  enabled?: boolean
  onNavigate?: (direction: NavigationDirection) => void
  onConfirm?: () => void
  onBack?: () => void
  onOption1?: () => void  // X/Square/Y
  onOption2?: () => void  // Y/Triangle/X
  onLeftBumper?: () => void
  onRightBumper?: () => void
  onStart?: () => void
  repeatDelay?: number   // ms before repeat starts
  repeatRate?: number    // ms between repeats
  scrollRef?: React.RefObject<HTMLElement>  // Optional ref to scrollable container for right stick scrolling
  scrollSpeed?: number   // Pixels per frame to scroll (default 8)
}

/**
 * High-level hook for UI navigation with gamepad
 * Handles D-pad/stick navigation with key repeat
 */
export function useGamepadNavigation(options: UseGamepadNavigationOptions = {}) {
  const {
    enabled = true,
    onNavigate,
    onConfirm,
    onBack,
    onOption1,
    onOption2,
    onLeftBumper,
    onRightBumper,
    onStart,
    scrollRef,
    scrollSpeed = 8
  } = options

  const { activeGamepadIndex, dpadRepeatDelay, dpadRepeatRate } = useInputStore()

  const repeatDelay = options.repeatDelay ?? dpadRepeatDelay
  const repeatRate = options.repeatRate ?? dpadRepeatRate

  // Store callbacks in refs to avoid effect restarts when callbacks change identity
  const callbacksRef = useRef({
    onNavigate,
    onConfirm,
    onBack,
    onOption1,
    onOption2,
    onLeftBumper,
    onRightBumper,
    onStart
  })
  
  // Update refs on every render
  callbacksRef.current = {
    onNavigate,
    onConfirm,
    onBack,
    onOption1,
    onOption2,
    onLeftBumper,
    onRightBumper,
    onStart
  }

  // Track navigation state for repeat
  const navigationState = useRef<{
    direction: NavigationDirection | null
    timestamp: number
    lastRepeat: number
    needsRelease: boolean  // When becoming enabled, require direction release before firing
  }>({
    direction: null,
    timestamp: 0,
    lastRepeat: 0,
    needsRelease: false
  })

  // Track button states for justPressed detection
  const previousButtonStates = useRef<Map<ButtonAction, boolean>>(new Map())

  // Track previous enabled state to detect when we become enabled
  const wasEnabled = useRef(false)

  const isJustPressed = useCallback((action: ButtonAction, pressed: boolean): boolean => {
    const wasPressed = previousButtonStates.current.get(action) ?? false
    return pressed && !wasPressed
  }, [])

  const checkStickDirection = useCallback((gamepadIndex: number): NavigationDirection | null => {
    const service = getGamepadService()
    const leftStick = service.getLeftStick(gamepadIndex)
    const threshold = 0.7

    // Prefer vertical axis if both are active
    if (Math.abs(leftStick.y) > Math.abs(leftStick.x)) {
      if (leftStick.y < -threshold) return 'up'
      if (leftStick.y > threshold) return 'down'
    } else {
      if (leftStick.x < -threshold) return 'left'
      if (leftStick.x > threshold) return 'right'
    }

    return null
  }, [])

  useEffect(() => {
    if (!enabled) {
      wasEnabled.current = false
      return
    }

    const service = getGamepadService()
    let animationFrameId: number
    let isFirstFrame = !wasEnabled.current
    wasEnabled.current = true

    const poll = () => {
      // Get the gamepad index to use - prefer activeGamepadIndex, fall back to first available
      let gamepadIndex = activeGamepadIndex
      if (gamepadIndex === null) {
        const gamepads = service.getGamepads()
        if (gamepads.length === 0) {
          animationFrameId = requestAnimationFrame(poll)
          return
        }
        gamepadIndex = gamepads[0].index
      }

      const now = Date.now()

      // Check D-pad buttons
      const dpadUp = service.isActionPressed(gamepadIndex, 'dpadUp')
      const dpadDown = service.isActionPressed(gamepadIndex, 'dpadDown')
      const dpadLeft = service.isActionPressed(gamepadIndex, 'dpadLeft')
      const dpadRight = service.isActionPressed(gamepadIndex, 'dpadRight')

      // Check stick
      const stickDirection = checkStickDirection(gamepadIndex)

      // Determine current direction (D-pad takes priority)
      let currentDirection: NavigationDirection | null = null
      if (dpadUp) currentDirection = 'up'
      else if (dpadDown) currentDirection = 'down'
      else if (dpadLeft) currentDirection = 'left'
      else if (dpadRight) currentDirection = 'right'
      else currentDirection = stickDirection

      // Handle navigation with repeat
      const state = navigationState.current

      // Check action buttons
      const confirmPressed = service.isActionPressed(gamepadIndex, 'confirm')
      const backPressed = service.isActionPressed(gamepadIndex, 'back')
      const option1Pressed = service.isActionPressed(gamepadIndex, 'option1')
      const option2Pressed = service.isActionPressed(gamepadIndex, 'option2')
      const lbPressed = service.isActionPressed(gamepadIndex, 'lb')
      const rbPressed = service.isActionPressed(gamepadIndex, 'rb')
      const startPressed = service.isActionPressed(gamepadIndex, 'start')

      // When first becoming enabled, if a direction is pressed, require release first
      // Also initialize button states to prevent false "justPressed" on held buttons
      if (isFirstFrame) {
        isFirstFrame = false
        if (currentDirection) {
          state.needsRelease = true
          state.direction = currentDirection
        }
        // Initialize button states so held buttons don't fire
        previousButtonStates.current.set('confirm', confirmPressed)
        previousButtonStates.current.set('back', backPressed)
        previousButtonStates.current.set('option1', option1Pressed)
        previousButtonStates.current.set('option2', option2Pressed)
        previousButtonStates.current.set('lb', lbPressed)
        previousButtonStates.current.set('rb', rbPressed)
        previousButtonStates.current.set('start', startPressed)
        animationFrameId = requestAnimationFrame(poll)
        return  // Skip processing this frame
      }

      // If we need a release, wait for no direction before accepting input
      if (state.needsRelease) {
        if (!currentDirection) {
          state.needsRelease = false
          state.direction = null
        }
      } else if (currentDirection) {
        if (state.direction !== currentDirection) {
          // New direction - fire immediately
          callbacksRef.current.onNavigate?.(currentDirection)
          state.direction = currentDirection
          state.timestamp = now
          state.lastRepeat = now
        } else {
          // Same direction - check for repeat
          const timeSincePress = now - state.timestamp
          const timeSinceRepeat = now - state.lastRepeat

          if (timeSincePress > repeatDelay && timeSinceRepeat > repeatRate) {
            callbacksRef.current.onNavigate?.(currentDirection)
            state.lastRepeat = now
          }
        }
      } else {
        // No direction - reset state
        state.direction = null
      }

      // Fire callbacks on justPressed
      // Note: Action buttons are NOT gated by needsRelease - only directional input is.
      // This ensures A/B/X/Y always work even if stick drift set needsRelease on first frame.
      const cbs = callbacksRef.current
      if (isJustPressed('confirm', confirmPressed)) cbs.onConfirm?.()
      if (isJustPressed('back', backPressed)) cbs.onBack?.()
      if (isJustPressed('option1', option1Pressed)) cbs.onOption1?.()
      if (isJustPressed('option2', option2Pressed)) cbs.onOption2?.()
      if (isJustPressed('lb', lbPressed)) cbs.onLeftBumper?.()
      if (isJustPressed('rb', rbPressed)) cbs.onRightBumper?.()
      if (isJustPressed('start', startPressed)) cbs.onStart?.()

      // Update previous states
      previousButtonStates.current.set('confirm', confirmPressed)
      previousButtonStates.current.set('back', backPressed)
      previousButtonStates.current.set('option1', option1Pressed)
      previousButtonStates.current.set('option2', option2Pressed)
      previousButtonStates.current.set('lb', lbPressed)
      previousButtonStates.current.set('rb', rbPressed)
      previousButtonStates.current.set('start', startPressed)

      // Handle right stick scrolling
      if (scrollRef?.current) {
        const rightStick = service.getRightStick(gamepadIndex)
        const deadzone = 0.2
        if (Math.abs(rightStick.y) > deadzone) {
          scrollRef.current.scrollTop += rightStick.y * scrollSpeed
        }
      }

      animationFrameId = requestAnimationFrame(poll)
    }

    animationFrameId = requestAnimationFrame(poll)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [
    enabled,
    activeGamepadIndex,
    repeatDelay,
    repeatRate,
    checkStickDirection,
    isJustPressed
    // Note: callbacks are accessed via callbacksRef to avoid effect restarts
  ])
}

export default useGamepadNavigation
