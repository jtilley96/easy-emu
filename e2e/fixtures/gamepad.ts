import { Page } from '@playwright/test'

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
 * Initialize gamepad emulation in the Electron window
 * This injects mock gamepads into the navigator.getGamepads API
 */
export async function initializeGamepadEmulation(window: Page) {
  await window.evaluate(() => {
    // Create mock gamepads array
    const mockGamepads: (Gamepad | null)[] = [null, null, null, null]

    // Helper to create mock button
    const createButton = (pressed = false, value?: number) => ({
      pressed,
      touched: pressed,
      value: value ?? (pressed ? 1 : 0)
    })

    // Helper to create mock gamepad
    const createMockGamepad = (index: number, id = 'Xbox 360 Controller'): Gamepad => ({
      id,
      index,
      connected: true,
      buttons: Array.from({ length: 17 }, () => createButton()),
      axes: [0, 0, 0, 0],
      mapping: 'standard',
      timestamp: Date.now(),
      hapticActuators: [] as any,
      vibrationActuator: null
    } as Gamepad)

    // Store helpers on window for later use
    (window as any).__gamepadEmulation = {
      mockGamepads,
      createButton,
      createMockGamepad,

      setGamepad: (index: number, gamepad: Gamepad | null) => {
        mockGamepads[index] = gamepad
      },

      pressButton: (gamepadIndex: number, buttonIndex: number) => {
        const gamepad = mockGamepads[gamepadIndex]
        if (!gamepad) return

        const buttons = [...gamepad.buttons]
        buttons[buttonIndex] = createButton(true)

        mockGamepads[gamepadIndex] = {
          ...gamepad,
          buttons,
          timestamp: Date.now()
        } as Gamepad
      },

      releaseButton: (gamepadIndex: number, buttonIndex: number) => {
        const gamepad = mockGamepads[gamepadIndex]
        if (!gamepad) return

        const buttons = [...gamepad.buttons]
        buttons[buttonIndex] = createButton(false)

        mockGamepads[gamepadIndex] = {
          ...gamepad,
          buttons,
          timestamp: Date.now()
        } as Gamepad
      },

      setAxis: (gamepadIndex: number, axisIndex: number, value: number) => {
        const gamepad = mockGamepads[gamepadIndex]
        if (!gamepad) return

        const axes = [...gamepad.axes]
        axes[axisIndex] = Math.max(-1, Math.min(1, value))

        mockGamepads[gamepadIndex] = {
          ...gamepad,
          axes,
          timestamp: Date.now()
        } as Gamepad
      },

      fireConnected: (gamepad: Gamepad) => {
        const event = new Event('gamepadconnected') as GamepadEvent
        Object.defineProperty(event, 'gamepad', { value: gamepad })
        window.dispatchEvent(event)
      },

      fireDisconnected: (gamepad: Gamepad) => {
        const event = new Event('gamepaddisconnected') as GamepadEvent
        Object.defineProperty(event, 'gamepad', { value: gamepad })
        window.dispatchEvent(event)
      }
    }

    // Override navigator.getGamepads
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [...mockGamepads],
      configurable: true
    })
  })
}

/**
 * Connect a virtual gamepad
 */
export async function connectGamepad(window: Page, index = 0, id = 'Xbox 360 Controller') {
  await window.evaluate(({ index, id }) => {
    const emu = (window as any).__gamepadEmulation
    if (!emu) return

    const gamepad = emu.createMockGamepad(index, id)
    emu.setGamepad(index, gamepad)
    emu.fireConnected(gamepad)
  }, { index, id })

  // Allow time for the app to process the connection
  await window.waitForTimeout(100)
}

/**
 * Disconnect a virtual gamepad
 */
export async function disconnectGamepad(window: Page, index = 0) {
  await window.evaluate((index) => {
    const emu = (window as any).__gamepadEmulation
    if (!emu) return

    const gamepad = emu.mockGamepads[index]
    if (gamepad) {
      emu.setGamepad(index, null)
      emu.fireDisconnected(gamepad)
    }
  }, index)

  await window.waitForTimeout(100)
}

/**
 * Press a gamepad button
 */
export async function pressButton(window: Page, gamepadIndex: number, buttonIndex: number) {
  await window.evaluate(({ gamepadIndex, buttonIndex }) => {
    const emu = (window as any).__gamepadEmulation
    if (!emu) return
    emu.pressButton(gamepadIndex, buttonIndex)
  }, { gamepadIndex, buttonIndex })
}

/**
 * Release a gamepad button
 */
export async function releaseButton(window: Page, gamepadIndex: number, buttonIndex: number) {
  await window.evaluate(({ gamepadIndex, buttonIndex }) => {
    const emu = (window as any).__gamepadEmulation
    if (!emu) return
    emu.releaseButton(gamepadIndex, buttonIndex)
  }, { gamepadIndex, buttonIndex })
}

/**
 * Press and release a button (tap)
 */
export async function tapButton(window: Page, gamepadIndex: number, buttonIndex: number, holdMs = 50) {
  await pressButton(window, gamepadIndex, buttonIndex)
  await window.waitForTimeout(holdMs)
  await releaseButton(window, gamepadIndex, buttonIndex)
  await window.waitForTimeout(50) // Allow time for app to process
}

/**
 * Set axis value
 */
export async function setAxis(window: Page, gamepadIndex: number, axisIndex: number, value: number) {
  await window.evaluate(({ gamepadIndex, axisIndex, value }) => {
    const emu = (window as any).__gamepadEmulation
    if (!emu) return
    emu.setAxis(gamepadIndex, axisIndex, value)
  }, { gamepadIndex, axisIndex, value })
}

/**
 * Move left stick in a direction
 */
export async function moveLeftStick(window: Page, gamepadIndex: number, x: number, y: number) {
  await setAxis(window, gamepadIndex, AXIS_INDICES.LEFT_X, x)
  await setAxis(window, gamepadIndex, AXIS_INDICES.LEFT_Y, y)
}

/**
 * Reset left stick to center
 */
export async function resetLeftStick(window: Page, gamepadIndex: number) {
  await moveLeftStick(window, gamepadIndex, 0, 0)
}

/**
 * Navigate with D-pad
 */
export async function dpadNavigate(window: Page, gamepadIndex: number, direction: 'up' | 'down' | 'left' | 'right') {
  const buttonMap = {
    up: BUTTON_INDICES.DPAD_UP,
    down: BUTTON_INDICES.DPAD_DOWN,
    left: BUTTON_INDICES.DPAD_LEFT,
    right: BUTTON_INDICES.DPAD_RIGHT
  }
  await tapButton(window, gamepadIndex, buttonMap[direction])
}

/**
 * Press A button (confirm)
 */
export async function pressA(window: Page, gamepadIndex = 0) {
  await tapButton(window, gamepadIndex, BUTTON_INDICES.A)
}

/**
 * Press B button (back)
 */
export async function pressB(window: Page, gamepadIndex = 0) {
  await tapButton(window, gamepadIndex, BUTTON_INDICES.B)
}

/**
 * Press Y button (secondary action)
 */
export async function pressY(window: Page, gamepadIndex = 0) {
  await tapButton(window, gamepadIndex, BUTTON_INDICES.Y)
}

/**
 * Press Start button
 */
export async function pressStart(window: Page, gamepadIndex = 0) {
  await tapButton(window, gamepadIndex, BUTTON_INDICES.START)
}
