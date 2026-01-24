import { test as base, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

/**
 * Electron test fixture
 * Provides electronApp and window fixtures for E2E testing
 */
export interface ElectronFixtures {
  electronApp: ElectronApplication
  window: Page
}

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({}, use) => {
    // Launch Electron app from built output
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist-electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    })

    // Wait for the app to be ready
    await electronApp.evaluate(async ({ app }) => {
      // Wait for app ready event
      return new Promise<void>((resolve) => {
        if (app.isReady()) {
          resolve()
        } else {
          app.on('ready', () => resolve())
        }
      })
    })

    await use(electronApp)

    // Cleanup
    await electronApp.close()
  },

  window: async ({ electronApp }, use) => {
    // Get the first window
    const window = await electronApp.firstWindow()

    // Wait for the window to be fully loaded
    await window.waitForLoadState('domcontentloaded')

    // Wait for React to mount (look for root element)
    await window.waitForSelector('#root', { state: 'attached' })

    // Small additional wait for React hydration
    await window.waitForTimeout(500)

    await use(window)
  }
})

export { expect } from '@playwright/test'

/**
 * Helper to navigate to a specific route in the app
 */
export async function navigateTo(window: Page, route: string) {
  // Use hash-based navigation for Electron
  await window.evaluate((r) => {
    window.location.hash = r
  }, route)

  // Wait for navigation to complete
  await window.waitForTimeout(300)
}

/**
 * Helper to get the current route
 */
export async function getCurrentRoute(window: Page): Promise<string> {
  return await window.evaluate(() => window.location.hash)
}

/**
 * Helper to wait for a toast notification
 */
export async function waitForToast(window: Page, text: string, timeout = 5000) {
  await window.waitForSelector(`text=${text}`, { timeout })
}

/**
 * Helper to check if in Big Picture mode
 */
export async function isInBigPictureMode(window: Page): Promise<boolean> {
  const hash = await getCurrentRoute(window)
  return hash.includes('/bigpicture')
}

/**
 * Helper to enter Big Picture mode
 */
export async function enterBigPictureMode(window: Page) {
  await navigateTo(window, '#/bigpicture')
  await window.waitForSelector('[data-testid="bp-layout"]', { timeout: 5000 }).catch(() => {
    // Fallback: just check the route
  })
}

/**
 * Helper to exit Big Picture mode
 */
export async function exitBigPictureMode(window: Page) {
  await navigateTo(window, '#/')
}
