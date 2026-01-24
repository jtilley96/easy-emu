import { Page, Locator } from '@playwright/test'

/**
 * Page object for the Library page
 */
export class LibraryPage {
  readonly page: Page
  readonly searchInput: Locator
  readonly gameCards: Locator
  readonly platformFilter: Locator
  readonly emptyState: Locator
  readonly scanButton: Locator

  constructor(page: Page) {
    this.page = page
    this.searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"]')
    this.gameCards = page.locator('[data-testid="game-card"], .game-card')
    this.platformFilter = page.locator('[data-testid="platform-filter"], select[name="platform"]')
    this.emptyState = page.locator('text=No games found')
    this.scanButton = page.locator('button:has-text("Scan")')
  }

  /**
   * Navigate to the library page
   */
  async goto() {
    await this.page.evaluate(() => {
      window.location.hash = '#/'
    })
    await this.page.waitForTimeout(300)
  }

  /**
   * Get all visible game cards
   */
  async getGameCards() {
    return this.gameCards.all()
  }

  /**
   * Get the number of visible games
   */
  async getGameCount(): Promise<number> {
    return this.gameCards.count()
  }

  /**
   * Search for games by title
   */
  async searchGames(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(300) // Wait for search debounce
  }

  /**
   * Clear the search input
   */
  async clearSearch() {
    await this.searchInput.clear()
    await this.page.waitForTimeout(300)
  }

  /**
   * Select a platform filter
   */
  async selectPlatformFilter(platform: string) {
    await this.platformFilter.selectOption(platform)
    await this.page.waitForTimeout(200)
  }

  /**
   * Click play on a specific game card
   */
  async playGame(gameTitle: string) {
    const gameCard = this.page.locator(`.game-card:has-text("${gameTitle}")`)
    await gameCard.hover()
    const playButton = gameCard.locator('[data-testid="play-button"], button:has(svg)')
    await playButton.click()
  }

  /**
   * Toggle favorite on a specific game
   */
  async toggleFavorite(gameTitle: string) {
    const gameCard = this.page.locator(`.game-card:has-text("${gameTitle}")`)
    await gameCard.hover()
    const favoriteButton = gameCard.locator('button:has-text("Star"), [title*="favorite"]')
    await favoriteButton.click()
  }

  /**
   * Navigate to a game's details page
   */
  async goToGameDetails(gameTitle: string) {
    const gameCard = this.page.locator(`.game-card:has-text("${gameTitle}"), a:has-text("${gameTitle}")`)
    await gameCard.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Check if a game is displayed
   */
  async isGameDisplayed(gameTitle: string): Promise<boolean> {
    const game = this.page.locator(`:text("${gameTitle}")`)
    return game.isVisible()
  }

  /**
   * Check if the empty state is shown
   */
  async isEmptyStateShown(): Promise<boolean> {
    return this.emptyState.isVisible()
  }

  /**
   * Wait for games to load
   */
  async waitForGamesToLoad(timeout = 5000) {
    try {
      await this.gameCards.first().waitFor({ timeout })
    } catch {
      // No games loaded, could be empty library
    }
  }
}
