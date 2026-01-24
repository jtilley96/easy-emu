import { registerConfigHandlers, loadConfig } from './config'
import { BrowserWindow } from 'electron'
import { registerLibraryHandlers, initDatabase } from './library'
import { registerEmulatorHandlers, setEmulatorMainWindow } from './emulators'
import { registerMetadataHandlers } from './metadata'
import { registerBiosHandlers } from './bios'
import { registerHasheousHandlers, setHasheousMainWindow } from './hasheous'
import { registerCoreHandlers, setCoresMainWindow } from './cores'
import { registerSaveHandlers } from './saveManager'
import { registerEmbeddedHandlers, setEmbeddedMainWindow } from './embeddedEmulator'

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
  registerHasheousHandlers(mainWindow)
  registerCoreHandlers()
  registerSaveHandlers()
  registerEmbeddedHandlers()

  // Set main window references for services that need to send events
  setEmulatorMainWindow(mainWindow ?? null)
  setHasheousMainWindow(mainWindow ?? null)
  setCoresMainWindow(mainWindow ?? null)
  setEmbeddedMainWindow(mainWindow ?? null)
}

export { loadConfig, getConfigValue, setConfigValue } from './config'
export { getGames, getGame, updateGame, scanFolders } from './library'
export { detectAllEmulators, launchGame } from './emulators'
export { getInstalledCores, getAvailableCores, downloadCore, deleteCore } from './cores'
export { loadSRAM, saveSRAM, saveState, loadState, listStates } from './saveManager'
export { checkCanPlayEmbedded, startSession, endSession } from './embeddedEmulator'
