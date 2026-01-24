import { test, expect } from '../fixtures/electron'
import { BigPicturePage } from '../pages/BigPicturePage'

test.describe('Big Picture Mode', () => {
  test('can navigate to big picture mode', async ({ window }) => {
    const bigPicturePage = new BigPicturePage(window)
    await bigPicturePage.goto()

    expect(await bigPicturePage.isActive()).toBe(true)
  })

  test('nav tabs are visible', async ({ window }) => {
    const bigPicturePage = new BigPicturePage(window)
    await bigPicturePage.goto()

    await expect(bigPicturePage.libraryTab).toBeVisible()
    await expect(bigPicturePage.systemsTab).toBeVisible()
    await expect(bigPicturePage.settingsTab).toBeVisible()
  })

  test('can navigate between tabs with keyboard', async ({ window }) => {
    const bigPicturePage = new BigPicturePage(window)
    await bigPicturePage.goto()

    // Navigate right to Systems
    await bigPicturePage.keyboardNavigate('ArrowRight')
    await window.waitForTimeout(100)

    // Navigate right to Settings
    await bigPicturePage.keyboardNavigate('ArrowRight')
    await window.waitForTimeout(100)

    // Press Enter to select Settings
    await bigPicturePage.keyboardConfirm()

    // Should be on settings page
    const hash = await window.evaluate(() => window.location.hash)
    expect(hash).toContain('/bigpicture/settings')
  })

  test('Escape key exits big picture mode when on nav', async ({ window }) => {
    const bigPicturePage = new BigPicturePage(window)
    await bigPicturePage.goto()

    // Press Escape while nav is focused
    await bigPicturePage.keyboardBack()

    // Should exit Big Picture mode
    expect(await bigPicturePage.isActive()).toBe(false)
  })

  test('Tab key exits big picture mode', async ({ window }) => {
    const bigPicturePage = new BigPicturePage(window)
    await bigPicturePage.goto()

    await bigPicturePage.keyboardExit()

    expect(await bigPicturePage.isActive()).toBe(false)
  })

  test('exit button works', async ({ window }) => {
    const bigPicturePage = new BigPicturePage(window)
    await bigPicturePage.goto()

    await bigPicturePage.exit()

    expect(await bigPicturePage.isActive()).toBe(false)
  })

  test.describe('Library tab', () => {
    test('shows filter bar', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()

      // Should show filters
      const allGamesFilter = window.locator('button:has-text("All Games")')
      await expect(allGamesFilter).toBeVisible()
    })

    test('can select different filters', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()

      // Click Favorites filter
      await bigPicturePage.selectFilter('Favorites')
      await window.waitForTimeout(200)

      // Click Recently Played filter
      await bigPicturePage.selectFilter('Recently Played')
      await window.waitForTimeout(200)

      // Click All Games filter
      await bigPicturePage.selectFilter('All Games')
    })
  })

  test.describe('Systems tab', () => {
    test('can navigate to Systems tab', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()

      await bigPicturePage.goToSystems()

      const hash = await window.evaluate(() => window.location.hash)
      expect(hash).toContain('/bigpicture/systems')
    })
  })

  test.describe('Settings tab', () => {
    test('can navigate to Settings tab', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()

      await bigPicturePage.goToSettings()

      const hash = await window.evaluate(() => window.location.hash)
      expect(hash).toContain('/bigpicture/settings')
    })

    test('shows settings sections', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()
      await bigPicturePage.goToSettings()

      // Should show settings sections
      const displaySection = window.locator('text=Display')
      const controllerSection = window.locator('text=Controller')

      await expect(displaySection).toBeVisible()
      await expect(controllerSection).toBeVisible()
    })
  })

  test.describe('keyboard navigation', () => {
    test('arrow keys navigate tabs', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()

      // Start on Library (first tab)
      // Move right
      await bigPicturePage.keyboardNavigate('ArrowRight')
      await window.waitForTimeout(100)

      // Move left back
      await bigPicturePage.keyboardNavigate('ArrowLeft')
      await window.waitForTimeout(100)
    })

    test('down arrow moves focus to content', async ({ window }) => {
      const bigPicturePage = new BigPicturePage(window)
      await bigPicturePage.goto()

      // Move down to content
      await bigPicturePage.keyboardNavigate('ArrowDown')
      await window.waitForTimeout(100)

      // Now Escape should go back to nav, not exit
      await bigPicturePage.keyboardBack()

      // Should still be in Big Picture mode (went back to nav)
      expect(await bigPicturePage.isActive()).toBe(true)
    })
  })
})
