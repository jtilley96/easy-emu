import { registerConfigHandlers, loadConfig } from './config'
import { registerLibraryHandlers, initDatabase } from './library'
import { registerEmulatorHandlers } from './emulators'
import { registerMetadataHandlers } from './metadata'

export function initializeServices(): void {
  // Load configuration first
  loadConfig()

  // Initialize library (JSON-based storage)
  initDatabase()

  // Register all IPC handlers
  registerConfigHandlers()
  registerLibraryHandlers()
  registerEmulatorHandlers()
  registerMetadataHandlers()
}

export { loadConfig, getConfigValue, setConfigValue } from './config'
export { getGames, getGame, updateGame, scanFolders } from './library'
export { detectAllEmulators, launchGame } from './emulators'
export { scrapeGame } from './metadata'
