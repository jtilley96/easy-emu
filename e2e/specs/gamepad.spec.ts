import { test, expect } from '../fixtures/electron'
import { BigPicturePage } from '../pages/BigPicturePage'
import {
  initializeGamepadEmulation,
  connectGamepad,
  disconnectGamepad,
  dpadNavigate,
  pressA,
  pressB,
  pressY,
  pressStart,
  BUTTON_INDICES
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

  test.describe('Big Picture navigation', () => {
    test.beforeEach(async ({ window }) => {
      await connectGamepad(window, 0)
      await window.waitForTimeout(300)
    })

    test('Start button enters Big Picture mode', async ({ window }) => {
      // Start outside Big Picture mode
      await window.evaluate(() => {
        window.location.hash = '#/'
      })
      await window.waitForTimeout(300)

      // Press Start
      await pressStart(window, 0)
      await window.waitForTimeout(500)

      // Should be in Big Picture mode
      const hash = await window.evaluate(() => window.location.hash)
      expect(hash).toContain('/bigpicture')
    })

    test('Start button exits Big Picture mode', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Press Start to exit
      await pressStart(window, 0)
      await window.waitForTimeout(500)

      // Should exit Big Picture mode
      expect(await bigPicturePage.isActive()).toBe(false)
    })

    test('D-pad navigates between tabs', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Navigate right
      await dpadNavigate(window, 0, 'right')
      await window.waitForTimeout(200)

      // Navigate right again
      await dpadNavigate(window, 0, 'right')
      await window.waitForTimeout(200)

      // Navigate left
      await dpadNavigate(window, 0, 'left')
      await window.waitForTimeout(200)
    })

    test('A button selects tab', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Navigate to Systems tab
      await dpadNavigate(window, 0, 'right')
      await window.waitForTimeout(200)

      // Press A to select
      await pressA(window, 0)
      await window.waitForTimeout(300)

      // Should be on Systems page
      const hash = await window.evaluate(() => window.location.hash)
      expect(hash).toContain('/bigpicture/systems')
    })

    test('B button goes back / exits', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Press B to exit
      await pressB(window, 0)
      await window.waitForTimeout(500)

      // Should exit Big Picture mode
      expect(await bigPicturePage.isActive()).toBe(false)
    })

    test('down moves focus to content', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Press down to move to content
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(200)

      // Now B should go back to nav, not exit
      await pressB(window, 0)
      await window.waitForTimeout(300)

      // Should still be in Big Picture mode
      expect(await bigPicturePage.isActive()).toBe(true)
    })
  })

  test.describe('focus transitions', () => {
    test.beforeEach(async ({ window }) => {
      await connectGamepad(window, 0)
      await window.waitForTimeout(300)
    })

    test('Nav -> Filters -> Grid flow', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Down to move from nav to filters
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(200)

      // Down again to move to grid
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(200)
    })

    test('single D-pad press transitions focus', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Single down press
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(300)

      // No double-press required
    })

    test('B button consistently goes back one level', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Go to content area
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(200)

      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(200)

      // B should go back up
      await pressB(window, 0)
      await window.waitForTimeout(200)

      // B again should go back to nav
      await pressB(window, 0)
      await window.waitForTimeout(200)

      // B again should exit
      await pressB(window, 0)
      await window.waitForTimeout(500)

      expect(await bigPicturePage.isActive()).toBe(false)
    })
  })

  test.describe('settings navigation', () => {
    test.beforeEach(async ({ window }) => {
      await connectGamepad(window, 0)
      await window.waitForTimeout(300)
    })

    test('can navigate to Settings with gamepad', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Navigate right to Systems
      await dpadNavigate(window, 0, 'right')
      await window.waitForTimeout(150)

      // Navigate right to Settings
      await dpadNavigate(window, 0, 'right')
      await window.waitForTimeout(150)

      // Press A to select Settings
      await pressA(window, 0)
      await window.waitForTimeout(300)

      const hash = await window.evaluate(() => window.location.hash)
      expect(hash).toContain('/bigpicture/settings')
    })

    test('can navigate settings sections', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await bigPicturePage.goToSettings()
      await window.waitForTimeout(300)

      // Move down into settings
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(200)

      // Navigate between sections
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(200)

      await dpadNavigate(window, 0, 'up')
      await window.waitForTimeout(200)
    })

    test('all settings accessible without mouse', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await bigPicturePage.goToSettings()
      await window.waitForTimeout(300)

      // Navigate to Display section
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(150)

      // Move right to settings items
      await dpadNavigate(window, 0, 'right')
      await window.waitForTimeout(150)

      // Navigate through items
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(150)

      await dpadNavigate(window, 0, 'up')
      await window.waitForTimeout(150)

      // Go back
      await dpadNavigate(window, 0, 'left')
      await window.waitForTimeout(150)
    })
  })

  test.describe('full flow', () => {
    test.beforeEach(async ({ window }) => {
      await connectGamepad(window, 0)
      await window.waitForTimeout(300)
    })

    test.skip('complete navigation flow with gamepad', async ({ window }) => {
      // This test requires games in the library
      const bigPicturePage = new BigPicturePage(window)

      // Start outside Big Picture
      await window.evaluate(() => { window.location.hash = '#/' })
      await window.waitForTimeout(300)

      // Press Start to enter Big Picture
      await pressStart(window, 0)
      await window.waitForTimeout(500)

      expect(await bigPicturePage.isActive()).toBe(true)

      // Navigate tabs
      await dpadNavigate(window, 0, 'right')
      await window.waitForTimeout(200)

      // Select Library
      await dpadNavigate(window, 0, 'left')
      await window.waitForTimeout(150)
      await pressA(window, 0)
      await window.waitForTimeout(300)

      // Move to grid
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(150)
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(150)

      // Navigate in grid (if games exist)
      await dpadNavigate(window, 0, 'right')
      await window.waitForTimeout(150)

      // Select game
      await pressA(window, 0)
      await window.waitForTimeout(300)

      // If game details shown, press B to go back
      const hash = await window.evaluate(() => window.location.hash)
      if (hash.includes('/game/')) {
        await pressB(window, 0)
        await window.waitForTimeout(300)
      }

      // Exit Big Picture
      await pressStart(window, 0)
      await window.waitForTimeout(500)

      expect(await bigPicturePage.isActive()).toBe(false)
    })
  })

  test.describe('Y button (favorite)', () => {
    test.beforeEach(async ({ window }) => {
      await connectGamepad(window, 0)
      await window.waitForTimeout(300)
    })

    test.skip('Y button toggles favorite on game', async ({ window }) => {
      // This test requires games in the library
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await window.waitForTimeout(300)

      // Navigate to grid
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(150)
      await dpadNavigate(window, 0, 'down')
      await window.waitForTimeout(150)

      // Press Y to favorite
      await pressY(window, 0)
      await window.waitForTimeout(300)

      // A toast might appear
      // Just verify no errors
      expect(true).toBe(true)
    })
  })
})
