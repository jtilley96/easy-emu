import { registerConfigHandlers, loadConfig } from './config'
import { BrowserWindow } from 'electron'
import { registerLibraryHandlers, initDatabase } from './library'
import { registerEmulatorHandlers } from './emulators'
import { registerMetadataHandlers } from './metadata'
import { registerBiosHandlers } from './bios'

export function initializeServices(mainWindow?: BrowserWindow | null): void {
  // Load configuration first
  loadConfig()

  // Initialize library (JSON-based storage)
  initDatabase()

  // Register all IPC handlers
  registerConfigHandlers()
  registerLibraryHandlers()
  registerEmulatorHandlers()
  registerMetadataHandlers()
  registerBiosHandlers()
}

export { loadConfig, getConfigValue, setConfigValue } from './config'
export { getGames, getGame, updateGame, scanFolders } from './library'
export { detectAllEmulators, launchGame } from './emulators'
