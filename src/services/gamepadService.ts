/**
 * Gamepad Service - Polls Gamepad API, normalizes input across controller types
 */

export interface GamepadState {
  id: string
  index: number
  name: string
  connected: boolean
  type: 'xbox' | 'playstation' | 'nintendo' | 'steamdeck' | 'generic'
  buttons: { pressed: boolean; justPressed: boolean; value: number }[]
  axes: number[]
}

export interface ControllerMapping {
  id: string
  name: string
  type: 'xbox' | 'playstation' | 'nintendo' | 'steamdeck' | 'generic'
  buttonMappings: Record<string, number>  // action -> button index
  axisMappings: Record<string, { axis: number; direction: 1 | -1 }>
}

// Standard button actions
export type ButtonAction =
  | 'confirm'      // A/X/B (South)
  | 'back'         // B/O/A (East)
  | 'option1'      // X/Square/Y (West)
  | 'option2'      // Y/Triangle/X (North)
  | 'lb'           // Left Bumper
  | 'rb'           // Right Bumper
  | 'lt'           // Left Trigger
  | 'rt'           // Right Trigger
  | 'select'       // Select/Share/Minus
  | 'start'        // Start/Options/Plus
  | 'l3'           // Left Stick Click
  | 'r3'           // Right Stick Click
  | 'dpadUp'
  | 'dpadDown'
  | 'dpadLeft'
  | 'dpadRight'
  | 'home'         // Guide/PS/Home

// Standard Xbox mapping (most common)
const XBOX_MAPPING: Record<ButtonAction, number> = {
  confirm: 0,      // A
  back: 1,         // B
  option1: 2,      // X
  option2: 3,      // Y
  lb: 4,
  rb: 5,
  lt: 6,
  rt: 7,
  select: 8,
  start: 9,
  l3: 10,
  r3: 11,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
  home: 16
}

// PlayStation mapping (button order differs)
const PLAYSTATION_MAPPING: Record<ButtonAction, number> = {
  confirm: 0,      // Cross
  back: 1,         // Circle
  option1: 2,      // Square
  option2: 3,      // Triangle
  lb: 4,           // L1
  rb: 5,           // R1
  lt: 6,           // L2
  rt: 7,           // R2
  select: 8,       // Share
  start: 9,        // Options
  l3: 10,
  r3: 11,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
  home: 16         // PS button
}

// Nintendo mapping (A/B and X/Y are swapped)
const NINTENDO_MAPPING: Record<ButtonAction, number> = {
  confirm: 1,      // A (right position on Nintendo)
  back: 0,         // B (bottom position on Nintendo)
  option1: 3,      // Y (top position on Nintendo)
  option2: 2,      // X (left position on Nintendo)
  lb: 4,           // L
  rb: 5,           // R
  lt: 6,           // ZL
  rt: 7,           // ZR
  select: 8,       // Minus
  start: 9,        // Plus
  l3: 10,
  r3: 11,
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
  home: 16         // Home
}

// Steam Deck mapping (follows standard/Xbox layout)
const STEAM_DECK_MAPPING: Record<ButtonAction, number> = {
  confirm: 0,      // A
  back: 1,         // B
  option1: 2,      // X
  option2: 3,      // Y
  lb: 4,           // L1
  rb: 5,           // R1
  lt: 6,           // L2
  rt: 7,           // R2
  select: 8,       // Select/View
  start: 9,        // Start/Menu
  l3: 10,          // L3
  r3: 11,          // R3
  dpadUp: 12,
  dpadDown: 13,
  dpadLeft: 14,
  dpadRight: 15,
  home: 16         // Steam button
}

type GamepadListener = (gamepads: GamepadState[]) => void
type ConnectionListener = (gamepad: GamepadState, connected: boolean) => void

class GamepadService {
  private static instance: GamepadService
  private gamepads: Map<number, GamepadState> = new Map()
  private previousButtonStates: Map<number, boolean[]> = new Map()
  private listeners: Set<GamepadListener> = new Set()
  private connectionListeners: Set<ConnectionListener> = new Set()
  private animationFrameId: number | null = null
  private deadzone: number = 0.15

  private constructor() {
    // Listen for gamepad connect/disconnect
    window.addEventListener('gamepadconnected', this.handleGamepadConnected)
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected)

    // Check for already-connected gamepads (happens if page was refreshed while controller connected)
    this.checkExistingGamepads()

    // Start polling
    this.startPolling()
  }

  private checkExistingGamepads() {
    const rawGamepads = navigator.getGamepads()
    for (const gamepad of rawGamepads) {
      if (gamepad && gamepad.connected) {
        const state = this.createGamepadState(gamepad)
        this.gamepads.set(gamepad.index, state)
        this.previousButtonStates.set(gamepad.index, gamepad.buttons.map(() => false))
      }
    }
  }

  static getInstance(): GamepadService {
    if (!GamepadService.instance) {
      GamepadService.instance = new GamepadService()
    }
    return GamepadService.instance
  }

  private handleGamepadConnected = (event: GamepadEvent) => {
    const gamepad = event.gamepad
    const state = this.createGamepadState(gamepad)
    this.gamepads.set(gamepad.index, state)
    this.previousButtonStates.set(gamepad.index, gamepad.buttons.map(() => false))
    this.connectionListeners.forEach(listener => listener(state, true))
  }

  private handleGamepadDisconnected = (event: GamepadEvent) => {
    const state = this.gamepads.get(event.gamepad.index)
    if (state) {
      state.connected = false
      this.connectionListeners.forEach(listener => listener(state, false))
    }
    this.gamepads.delete(event.gamepad.index)
    this.previousButtonStates.delete(event.gamepad.index)
  }

  private detectControllerType(id: string): 'xbox' | 'playstation' | 'nintendo' | 'steamdeck' | 'generic' {
    const lowerId = id.toLowerCase()

    // Steam Deck / Steam Input detection (check first as it may also contain other keywords)
    // Steam Input can present controllers with various IDs
    if (lowerId.includes('steam') || lowerId.includes('deck') || lowerId.includes('valve')) {
      return 'steamdeck'
    }
    // Steam Input virtual controller often shows as "Microsoft Xbox 360" or similar
    // Check for specific Steam Input patterns
    if (lowerId.includes('virtual') && lowerId.includes('controller')) {
      return 'steamdeck'  // Treat Steam virtual controllers as Steam Deck layout
    }
    if (lowerId.includes('xbox') || lowerId.includes('xinput') || lowerId.includes('microsoft')) {
      return 'xbox'
    }
    if (lowerId.includes('playstation') || lowerId.includes('dualshock') || lowerId.includes('dualsense') || lowerId.includes('sony')) {
      return 'playstation'
    }
    if (lowerId.includes('nintendo') || lowerId.includes('pro controller') || lowerId.includes('joy-con') || lowerId.includes('switch')) {
      return 'nintendo'
    }

    return 'generic'
  }

  private createGamepadState(gamepad: Gamepad): GamepadState {
    const type = this.detectControllerType(gamepad.id)
    const previousStates = this.previousButtonStates.get(gamepad.index) || []

    return {
      id: gamepad.id,
      index: gamepad.index,
      name: this.getControllerName(gamepad.id, type),
      connected: gamepad.connected,
      type,
      buttons: gamepad.buttons.map((button, i) => ({
        pressed: button.pressed,
        justPressed: button.pressed && !previousStates[i],
        value: button.value
      })),
      axes: gamepad.axes.map(axis => this.applyDeadzone(axis))
    }
  }

  private getControllerName(id: string, type: 'xbox' | 'playstation' | 'nintendo' | 'steamdeck' | 'generic'): string {
    // Try to extract a readable name
    const match = id.match(/^([^(]+)/)
    if (match) {
      const name = match[1].trim()
      if (name && name.length > 0 && name.length < 50) {
        return name
      }
    }

    // Fall back to generic names
    switch (type) {
      case 'xbox': return 'Xbox Controller'
      case 'playstation': return 'PlayStation Controller'
      case 'nintendo': return 'Nintendo Controller'
      case 'steamdeck': return 'Steam Deck Controller'
      default: return 'Controller'
    }
  }

  private applyDeadzone(value: number): number {
    if (Math.abs(value) < this.deadzone) {
      return 0
    }
    // Rescale value to account for deadzone
    const sign = value > 0 ? 1 : -1
    return sign * ((Math.abs(value) - this.deadzone) / (1 - this.deadzone))
  }

  private poll = () => {
    const rawGamepads = navigator.getGamepads()

    for (const gamepad of rawGamepads) {
      if (gamepad) {
        const previousStates = this.previousButtonStates.get(gamepad.index)
        const state = this.createGamepadState(gamepad)
        this.gamepads.set(gamepad.index, state)

        // Update previous states for next frame
        if (previousStates) {
          gamepad.buttons.forEach((button, i) => {
            previousStates[i] = button.pressed
          })
        }
      }
    }

    // Notify listeners
    const gamepadArray = Array.from(this.gamepads.values())
    this.listeners.forEach(listener => listener(gamepadArray))

    this.animationFrameId = requestAnimationFrame(this.poll)
  }

  private startPolling() {
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(this.poll)
    }
  }

  stopPolling() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  setDeadzone(value: number) {
    this.deadzone = Math.max(0, Math.min(0.5, value))
  }

  getGamepads(): GamepadState[] {
    return Array.from(this.gamepads.values())
  }

  getGamepad(index: number): GamepadState | undefined {
    return this.gamepads.get(index)
  }

  subscribe(listener: GamepadListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener)
    return () => this.connectionListeners.delete(listener)
  }

  // Get the button index for an action based on controller type
  getButtonIndex(action: ButtonAction, type: 'xbox' | 'playstation' | 'nintendo' | 'steamdeck' | 'generic'): number {
    switch (type) {
      case 'playstation':
        return PLAYSTATION_MAPPING[action]
      case 'nintendo':
        return NINTENDO_MAPPING[action]
      case 'steamdeck':
        return STEAM_DECK_MAPPING[action]
      case 'xbox':
      default:
        return XBOX_MAPPING[action]
    }
  }

  // Check if an action is pressed on a specific gamepad
  isActionPressed(gamepadIndex: number, action: ButtonAction): boolean {
    const gamepad = this.gamepads.get(gamepadIndex)
    if (!gamepad) return false

    const buttonIndex = this.getButtonIndex(action, gamepad.type)
    return gamepad.buttons[buttonIndex]?.pressed ?? false
  }

  // Check if an action was just pressed this frame
  isActionJustPressed(gamepadIndex: number, action: ButtonAction): boolean {
    const gamepad = this.gamepads.get(gamepadIndex)
    if (!gamepad) return false

    const buttonIndex = this.getButtonIndex(action, gamepad.type)
    return gamepad.buttons[buttonIndex]?.justPressed ?? false
  }

  // Get left stick values
  getLeftStick(gamepadIndex: number): { x: number; y: number } {
    const gamepad = this.gamepads.get(gamepadIndex)
    if (!gamepad) return { x: 0, y: 0 }

    return {
      x: gamepad.axes[0] ?? 0,
      y: gamepad.axes[1] ?? 0
    }
  }

  // Get right stick values
  getRightStick(gamepadIndex: number): { x: number; y: number } {
    const gamepad = this.gamepads.get(gamepadIndex)
    if (!gamepad) return { x: 0, y: 0 }

    return {
      x: gamepad.axes[2] ?? 0,
      y: gamepad.axes[3] ?? 0
    }
  }

  // Check D-pad using axes (some controllers report D-pad as axes 6/7 or 9)
  getDpadFromAxes(gamepadIndex: number): { up: boolean; down: boolean; left: boolean; right: boolean } {
    const gamepad = this.gamepads.get(gamepadIndex)
    if (!gamepad) return { up: false, down: false, left: false, right: false }

    // Some Linux drivers report D-pad on axes 6 (horizontal) and 7 (vertical)
    // Values are typically -1, 0, or 1
    const dpadThreshold = 0.5
    const axis6 = gamepad.axes[6] ?? 0
    const axis7 = gamepad.axes[7] ?? 0

    // Note: Some controllers use axis 9 as a hat switch, but axes 6/7 are more common
    // for D-pad on Linux. The raw input logging will show if other axes are being used.

    return {
      up: axis7 < -dpadThreshold,
      down: axis7 > dpadThreshold,
      left: axis6 < -dpadThreshold,
      right: axis6 > dpadThreshold
    }
  }

  // Get navigation direction from D-pad or left stick
  getNavigationDirection(gamepadIndex: number): 'up' | 'down' | 'left' | 'right' | null {
    const gamepad = this.gamepads.get(gamepadIndex)
    if (!gamepad) return null

    // Check D-pad buttons first (higher priority)
    if (this.isActionJustPressed(gamepadIndex, 'dpadUp')) return 'up'
    if (this.isActionJustPressed(gamepadIndex, 'dpadDown')) return 'down'
    if (this.isActionJustPressed(gamepadIndex, 'dpadLeft')) return 'left'
    if (this.isActionJustPressed(gamepadIndex, 'dpadRight')) return 'right'

    // Check D-pad via axes (Linux/Steam Deck may report D-pad this way)
    const dpadAxes = this.getDpadFromAxes(gamepadIndex)
    if (dpadAxes.up) return 'up'
    if (dpadAxes.down) return 'down'
    if (dpadAxes.left) return 'left'
    if (dpadAxes.right) return 'right'

    // Check left stick
    const leftStick = this.getLeftStick(gamepadIndex)
    const threshold = 0.7

    // Only trigger on stick movement (handled by justPressed simulation in hook)
    if (Math.abs(leftStick.y) > Math.abs(leftStick.x)) {
      if (leftStick.y < -threshold) return 'up'
      if (leftStick.y > threshold) return 'down'
    } else {
      if (leftStick.x < -threshold) return 'left'
      if (leftStick.x > threshold) return 'right'
    }

    return null
  }

  // Get default mapping for controller type
  getDefaultMapping(type: 'xbox' | 'playstation' | 'nintendo' | 'steamdeck' | 'generic'): Record<ButtonAction, number> {
    switch (type) {
      case 'playstation':
        return { ...PLAYSTATION_MAPPING }
      case 'nintendo':
        return { ...NINTENDO_MAPPING }
      case 'steamdeck':
        return { ...STEAM_DECK_MAPPING }
      case 'xbox':
      default:
        return { ...XBOX_MAPPING }
    }
  }
}

// Export singleton instance getter
export const getGamepadService = GamepadService.getInstance.bind(GamepadService)
export default GamepadService
