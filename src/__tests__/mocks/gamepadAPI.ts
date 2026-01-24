import { vi } from 'vitest'

/**
 * Mock gamepad button
 */
export interface MockGamepadButton {
  pressed: boolean
  touched: boolean
  value: number
}

/**
 * Create a mock gamepad button
 */
export function createMockButton(pressed = false, value?: number): MockGamepadButton {
  return {
    pressed,
    touched: pressed,
    value: value ?? (pressed ? 1 : 0)
  }
}

/**
 * Standard button indices for Xbox-style controllers
 */
export const BUTTON_INDICES = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  HOME: 16
} as const

/**
 * Standard axis indices
 */
export const AXIS_INDICES = {
  LEFT_X: 0,
  LEFT_Y: 1,
  RIGHT_X: 2,
  RIGHT_Y: 3
} as const

/**
 * Create a mock Gamepad object
 */
export function createMockGamepad(overrides: Partial<{
  id: string
  index: number
  connected: boolean
  buttons: MockGamepadButton[]
  axes: number[]
  mapping: GamepadMappingType
  timestamp: number
  hapticActuators: readonly GamepadHapticActuator[]
  vibrationActuator: GamepadHapticActuator | null
}> = {}): Gamepad {
  const defaultButtons = Array.from({ length: 17 }, () => createMockButton())
  const defaultAxes = [0, 0, 0, 0]

  return {
    id: overrides.id ?? 'Xbox 360 Controller (XInput STANDARD GAMEPAD)',
    index: overrides.index ?? 0,
    connected: overrides.connected ?? true,
    buttons: overrides.buttons ?? defaultButtons,
    axes: overrides.axes ?? defaultAxes,
    mapping: overrides.mapping ?? 'standard',
    timestamp: overrides.timestamp ?? Date.now(),
    hapticActuators: overrides.hapticActuators ?? [],
    vibrationActuator: overrides.vibrationActuator ?? null
  } as Gamepad
}

/**
 * Create mock gamepads array (4 slots, matching browser API)
 */
let mockGamepads: (Gamepad | null)[] = [null, null, null, null]

/**
 * Install mock navigator.getGamepads
 */
export function installMockGamepadAPI() {
  mockGamepads = [null, null, null, null]

  vi.stubGlobal('navigator', {
    ...navigator,
    getGamepads: vi.fn(() => [...mockGamepads])
  })

  return {
    getGamepads: () => mockGamepads,
    setGamepad,
    clearGamepads,
    pressButton,
    releaseButton,
    setAxis,
    createMockGamepad
  }
}

/**
 * Set a gamepad at a specific index
 */
export function setGamepad(index: number, gamepad: Gamepad | null) {
  if (index >= 0 && index < 4) {
    mockGamepads[index] = gamepad
  }
}

/**
 * Clear all gamepads
 */
export function clearGamepads() {
  mockGamepads = [null, null, null, null]
}

/**
 * Simulate pressing a button on a gamepad
 */
export function pressButton(gamepadIndex: number, buttonIndex: number) {
  const gamepad = mockGamepads[gamepadIndex]
  if (!gamepad) return

  const buttons = [...gamepad.buttons]
  buttons[buttonIndex] = createMockButton(true)

  mockGamepads[gamepadIndex] = {
    ...gamepad,
    buttons,
    timestamp: Date.now()
  } as Gamepad
}

/**
 * Simulate releasing a button on a gamepad
 */
export function releaseButton(gamepadIndex: number, buttonIndex: number) {
  const gamepad = mockGamepads[gamepadIndex]
  if (!gamepad) return

  const buttons = [...gamepad.buttons]
  buttons[buttonIndex] = createMockButton(false)

  mockGamepads[gamepadIndex] = {
    ...gamepad,
    buttons,
    timestamp: Date.now()
  } as Gamepad
}

/**
 * Set an axis value on a gamepad
 */
export function setAxis(gamepadIndex: number, axisIndex: number, value: number) {
  const gamepad = mockGamepads[gamepadIndex]
  if (!gamepad) return

  const axes = [...gamepad.axes]
  axes[axisIndex] = Math.max(-1, Math.min(1, value))

  mockGamepads[gamepadIndex] = {
    ...gamepad,
    axes,
    timestamp: Date.now()
  } as Gamepad
}

/**
 * Create a mock gamepad with specific controller type
 */
export function createMockGamepadByType(
  type: 'xbox' | 'playstation' | 'nintendo' | 'generic',
  index = 0
): Gamepad {
  const ids: Record<typeof type, string> = {
    xbox: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)',
    playstation: 'DualShock 4 (STANDARD GAMEPAD Vendor: 054c Product: 05c4)',
    nintendo: 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)',
    generic: 'Generic USB Joystick (Vendor: 0000 Product: 0000)'
  }

  return createMockGamepad({
    id: ids[type],
    index
  })
}

/**
 * Simulate gamepadconnected event
 */
export function fireGamepadConnected(gamepad: Gamepad) {
  const event = new Event('gamepadconnected') as GamepadEvent
  Object.defineProperty(event, 'gamepad', { value: gamepad })
  window.dispatchEvent(event)
}

/**
 * Simulate gamepaddisconnected event
 */
export function fireGamepadDisconnected(gamepad: Gamepad) {
  const event = new Event('gamepaddisconnected') as GamepadEvent
  Object.defineProperty(event, 'gamepad', { value: gamepad })
  window.dispatchEvent(event)
}

/**
 * Helper to create a gamepad with a specific button pressed
 */
export function createGamepadWithButtonPressed(
  buttonIndex: number,
  options: { index?: number; id?: string } = {}
): Gamepad {
  const buttons = Array.from({ length: 17 }, (_, i) =>
    createMockButton(i === buttonIndex)
  )

  return createMockGamepad({
    index: options.index ?? 0,
    id: options.id,
    buttons
  })
}

/**
 * Helper to create a gamepad with analog stick input
 */
export function createGamepadWithStickInput(
  leftX = 0,
  leftY = 0,
  rightX = 0,
  rightY = 0,
  options: { index?: number; id?: string } = {}
): Gamepad {
  return createMockGamepad({
    index: options.index ?? 0,
    id: options.id,
    axes: [leftX, leftY, rightX, rightY]
  })
}
