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
    statesPath: path.join(userData, 'states'),
    screenshotsPath: path.join(userData, 'screenshots'),
    coversPath: path.join(userData, 'covers'),
    autoScrape: false,
    startMinimized: false,
    checkUpdates: true
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
    config.coversPath
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
