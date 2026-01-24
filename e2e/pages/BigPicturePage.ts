import { Page, Locator } from '@playwright/test'

/**
 * Page object for the Big Picture mode
 */
export class BigPicturePage {
  readonly page: Page
  readonly layout: Locator
  readonly navTabs: Locator
  readonly libraryTab: Locator
  readonly systemsTab: Locator
  readonly settingsTab: Locator
  readonly exitButton: Locator
  readonly gameGrid: Locator
  readonly filterBar: Locator
  readonly controllerHints: Locator

  constructor(page: Page) {
    this.page = page
    this.layout = page.locator('[data-testid="bp-layout"], .bg-surface-950')
    this.navTabs = page.locator('nav button')
    this.libraryTab = page.locator('button:has-text("Library")')
    this.systemsTab = page.locator('button:has-text("Systems")')
    this.settingsTab = page.locator('button:has-text("Settings")')
    this.exitButton = page.locator('button[title*="Exit"]')
    this.gameGrid = page.locator('.grid')
    this.filterBar = page.locator('text=Filter')
    this.controllerHints = page.locator('[data-testid="controller-hints"]')
  }

  /**
   * Navigate to Big Picture mode
   */
  async goto() {
    await this.page.evaluate(() => {
      window.location.hash = '#/bigpicture'
    })
    await this.page.waitForTimeout(300)
  }

  /**
   * Exit Big Picture mode
   */
  async exit() {
    await this.exitButton.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Check if in Big Picture mode
   */
  async isActive(): Promise<boolean> {
    const hash = await this.page.evaluate(() => window.location.hash)
    return hash.includes('/bigpicture')
  }

  /**
   * Navigate to Library tab
   */
  async goToLibrary() {
    await this.libraryTab.click()
    await this.page.waitForTimeout(200)
  }

  /**
   * Navigate to Systems tab
   */
  async goToSystems() {
    await this.systemsTab.click()
    await this.page.waitForTimeout(200)
  }

  /**
   * Navigate to Settings tab
   */
  async goToSettings() {
    await this.settingsTab.click()
    await this.page.waitForTimeout(200)
  }

  /**
   * Get the currently focused nav tab
   */
  async getFocusedTab(): Promise<string | null> {
    const focusedTab = this.page.locator('nav button.bp-focus')
    const count = await focusedTab.count()
    if (count === 0) return null
    return focusedTab.textContent()
  }

  /**
   * Get all visible game cards in the grid
   */
  async getGameCards() {
    return this.page.locator('.game-card, [data-testid^="game-card"]').all()
  }

  /**
   * Get the number of visible games
   */
  async getGameCount(): Promise<number> {
    return this.page.locator('.game-card, [data-testid^="game-card"]').count()
  }

  /**
   * Check if a specific filter is active
   */
  async isFilterActive(filterName: string): Promise<boolean> {
    const filter = this.page.locator(`button:has-text("${filterName}").bg-surface-700`)
    return filter.isVisible()
  }

  /**
   * Select a filter
   */
  async selectFilter(filterName: string) {
    await this.page.locator(`button:has-text("${filterName}")`).click()
    await this.page.waitForTimeout(200)
  }

  /**
   * Get the currently focused game (if any)
   */
  async getFocusedGame(): Promise<Locator | null> {
    const focused = this.page.locator('.bp-focus, [data-focused="true"]')
    const count = await focused.count()
    return count > 0 ? focused.first() : null
  }

  /**
   * Check if game details are shown
   */
  async isGameDetailsShown(): Promise<boolean> {
    const hash = await this.page.evaluate(() => window.location.hash)
    return hash.includes('/bigpicture/game/')
  }

  /**
   * Get the play button on game details
   */
  getPlayButton(): Locator {
    return this.page.locator('button:has-text("Play")')
  }

  /**
   * Get the back button on game details
   */
  getBackButton(): Locator {
    return this.page.locator('button:has-text("Back")')
  }

  /**
   * Get the favorite button on game details
   */
  getFavoriteButton(): Locator {
    return this.page.locator('button:has-text("Favorite"), button:has-text("Favorited")')
  }

  /**
   * Navigate using keyboard
   */
  async keyboardNavigate(direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
    await this.page.keyboard.press(direction)
    await this.page.waitForTimeout(100)
  }

  /**
   * Press Enter to confirm
   */
  async keyboardConfirm() {
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(200)
  }

  /**
   * Press Escape to go back
   */
  async keyboardBack() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(200)
  }

  /**
   * Press Tab to exit Big Picture mode
   */
  async keyboardExit() {
    await this.page.keyboard.press('Tab')
    await this.page.waitForTimeout(200)
  }
}
