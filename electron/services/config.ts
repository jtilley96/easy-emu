import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

export interface AppConfig {
  hasCompletedSetup: boolean
  romFolders: string[]
  emulatorPaths: Record<string, string>
  defaultEmulatorPerPlatform: Record<string, string>
  emulatorEnabled: Record<string, boolean>
  biosPaths: Record<string, string>
  savesPath: string
  statesPath: string
  screenshotsPath: string
  coversPath: string
  autoScrape: boolean
  startMinimized: boolean
  checkUpdates: boolean
  // Embedded emulation settings
  embeddedCoresPath: string
  preferEmbedded: boolean
  embeddedShader: 'none' | 'crt-lottes' | 'crt-mattias' | 'scanlines'
  embeddedIntegerScaling: boolean
  embeddedAutoSave: boolean
  embeddedAutoSaveInterval: number // seconds
  // Controller settings
  controllerMappings: Record<string, unknown>
  keyboardShortcuts: Record<string, string>
  emulatorHotkeys: Record<string, string> // F1-F12 key to action mapping
  analogDeadzone: number
  dpadRepeatDelay: number
  dpadRepeatRate: number
  // Big Picture settings
  bigPictureModeEnabled: boolean
  bigPictureOnStartup: boolean
  bigPictureCardSize: 'small' | 'medium' | 'large'
  // Library UI settings
  libraryViewMode: 'grid' | 'list'
  libraryPlatformFilter: string | null
}

const CONFIG_FILE = 'config.json'

let config: AppConfig | null = null

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE)
}

function getDefaultConfig(): AppConfig {
  const userData = app.getPath('userData')
  return {
    hasCompletedSetup: false,
    romFolders: [],
    emulatorPaths: {},
    defaultEmulatorPerPlatform: {},
    emulatorEnabled: {},
    biosPaths: {},
    savesPath: path.join(userData, 'saves'),
    statesPath: path.join(userData, 'saves', 'states'),
    screenshotsPath: path.join(userData, 'screenshots'),
    coversPath: path.join(userData, 'covers'),
    autoScrape: false,
    startMinimized: false,
    checkUpdates: true,
    // Embedded emulation defaults
    embeddedCoresPath: path.join(userData, 'cores'),
    preferEmbedded: true,
    embeddedShader: 'none',
    embeddedIntegerScaling: true,
    embeddedAutoSave: true,
    embeddedAutoSaveInterval: 60,
    // Controller defaults
    controllerMappings: {},
    keyboardShortcuts: {},
    emulatorHotkeys: {
      F1: 'quickSave',
      F2: 'quickLoad',
      F3: 'screenshot',
      F4: 'fastForward',
      F5: 'saveState',
      F6: 'loadState',
      F7: 'rewind',
      F8: 'pause',
      F9: 'mute',
      F10: 'fullscreen',
      F11: 'none',
      F12: 'none'
    },
    analogDeadzone: 0.15,
    dpadRepeatDelay: 400,
    dpadRepeatRate: 100,
    // Big Picture defaults
    bigPictureModeEnabled: false,
    bigPictureOnStartup: false,
    bigPictureCardSize: 'medium',
    // Library UI defaults
    libraryViewMode: 'grid',
    libraryPlatformFilter: null
  }
}

export function loadConfig(): AppConfig {
  if (config) return config

  const configPath = getConfigPath()

  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      config = { ...getDefaultConfig(), ...JSON.parse(data) }
    } else {
      config = getDefaultConfig()
      saveConfig()
    }
  } catch (error) {
    console.error('Failed to load config:', error)
    config = getDefaultConfig()
  }

  // Ensure directories exist
  ensureDirectories()

  return config
}

export function saveConfig(): void {
  if (!config) return

  const configPath = getConfigPath()

  try {
    const dir = path.dirname(configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to save config:', error)
  }
}

function ensureDirectories(): void {
  if (!config) return

  const dirs = [
    config.savesPath,
    config.statesPath,
    config.screenshotsPath,
    config.coversPath,
    config.embeddedCoresPath
  ]

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true })
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error)
      }
    }
  }
}

export function getConfigValue<K extends keyof AppConfig>(key: K): AppConfig[K] {
  if (!config) loadConfig()
  return config![key]
}

export function setConfigValue<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  if (!config) loadConfig()
  config![key] = value
  saveConfig()
}

// Register IPC handlers
export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', (_event, key: string) => {
    if (!config) loadConfig()
    return (config as Record<string, unknown>)[key]
  })

  ipcMain.handle('config:set', (_event, key: string, value: unknown) => {
    if (!config) loadConfig()
    ;(config as Record<string, unknown>)[key] = value
    saveConfig()
  })

  ipcMain.handle('config:getAll', () => {
    if (!config) loadConfig()
    return config
  })
}
