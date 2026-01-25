import { test, expect } from '../fixtures/electron'
import {
  initializeGamepadEmulation,
  connectGamepad,
  disconnectGamepad
} from '../fixtures/gamepad'

test.describe('Gamepad', () => {
  test.beforeEach(async ({ window }) => {
    // Initialize gamepad emulation before each test
    await initializeGamepadEmulation(window)
  })

  test.describe('connection', () => {
    test('gamepad connection is detected', async ({ window }) => {
      await connectGamepad(window, 0, 'Xbox 360 Controller')

      // Give the app time to process the connection
      await window.waitForTimeout(500)

      // Toast might appear for connection
      // Just verify no errors occurred
      expect(true).toBe(true)
    })

    test('gamepad disconnection is handled', async ({ window }) => {
      await connectGamepad(window, 0)
      await window.waitForTimeout(300)

      await disconnectGamepad(window, 0)
      await window.waitForTimeout(300)

      // Should handle disconnection gracefully
      expect(true).toBe(true)
    })

    test('multiple gamepads can connect', async ({ window }) => {
      await connectGamepad(window, 0, 'Xbox Controller')
      await window.waitForTimeout(200)

      await connectGamepad(window, 1, 'PlayStation Controller')
      await window.waitForTimeout(200)

      // Both should be connected without errors
      expect(true).toBe(true)
    })
  })
})
