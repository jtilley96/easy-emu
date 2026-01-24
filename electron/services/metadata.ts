import { ipcMain } from 'electron'
import { updateGame, GameRecord } from './library'

export function registerMetadataHandlers(): void {
  ipcMain.handle('metadata:update', async (_event, gameId: string, metadata: Record<string, unknown>) => {
    updateGame(gameId, metadata as Partial<GameRecord>)
  })
}
