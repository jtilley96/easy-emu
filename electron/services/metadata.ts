import { ipcMain } from 'electron'
import { updateGame, GameRecord } from './library'

// Re-export scrape functions from hasheous for backwards compatibility
export { scrapeGame, scrapeGames, cancelScrape } from './hasheous'

export function registerMetadataHandlers(): void {
  ipcMain.handle('metadata:update', async (_event, gameId: string, metadata: Record<string, unknown>) => {
    updateGame(gameId, metadata as Partial<GameRecord>)
  })
}
