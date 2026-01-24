import { app, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import { getGame } from './library'

export interface SaveStateInfo {
  slot: number
  exists: boolean
  timestamp?: string
  screenshotPath?: string
  size?: number
}

function getSavesBasePath(): string {
  return path.join(app.getPath('userData'), 'saves')
}

function getSramPath(gameId: string, platform: string): string {
  return path.join(getSavesBasePath(), 'sram', platform, `${gameId}.srm`)
}

function getStatesPath(gameId: string): string {
  return path.join(getSavesBasePath(), 'states', gameId)
}

function getStatePath(gameId: string, slot: number): string {
  return path.join(getStatesPath(gameId), `state_${slot}.state`)
}

function getStateScreenshotPath(gameId: string, slot: number): string {
  return path.join(getStatesPath(gameId), `state_${slot}.png`)
}

function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// SRAM Save Management
export async function loadSRAM(gameId: string): Promise<ArrayBuffer | null> {
  const game = getGame(gameId)
  if (!game) return null

  const sramPath = getSramPath(gameId, game.platform)

  try {
    if (fs.existsSync(sramPath)) {
      const buffer = fs.readFileSync(sramPath)
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    }
  } catch (error) {
    console.error('Failed to load SRAM:', error)
  }

  return null
}

export async function saveSRAM(gameId: string, data: ArrayBuffer): Promise<void> {
  const game = getGame(gameId)
  if (!game) {
    throw new Error(`Game not found: ${gameId}`)
  }

  const sramPath = getSramPath(gameId, game.platform)
  ensureDirectoryExists(sramPath)

  try {
    const buffer = Buffer.from(data)
    fs.writeFileSync(sramPath, buffer)
  } catch (error) {
    console.error('Failed to save SRAM:', error)
    throw error
  }
}

// Save State Management
export async function saveState(gameId: string, slot: number, data: ArrayBuffer, screenshot?: ArrayBuffer): Promise<void> {
  if (slot < 0 || slot > 9) {
    throw new Error('Save slot must be between 0 and 9')
  }

  const statePath = getStatePath(gameId, slot)
  ensureDirectoryExists(statePath)

  try {
    // Save state data
    const stateBuffer = Buffer.from(data)
    fs.writeFileSync(statePath, stateBuffer)

    // Save screenshot if provided
    if (screenshot) {
      const screenshotPath = getStateScreenshotPath(gameId, slot)
      const screenshotBuffer = Buffer.from(screenshot)
      fs.writeFileSync(screenshotPath, screenshotBuffer)
    }
  } catch (error) {
    console.error('Failed to save state:', error)
    throw error
  }
}

export async function loadState(gameId: string, slot: number): Promise<ArrayBuffer | null> {
  if (slot < 0 || slot > 9) {
    throw new Error('Save slot must be between 0 and 9')
  }

  const statePath = getStatePath(gameId, slot)

  try {
    if (fs.existsSync(statePath)) {
      const buffer = fs.readFileSync(statePath)
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    }
  } catch (error) {
    console.error('Failed to load state:', error)
  }

  return null
}

export async function deleteState(gameId: string, slot: number): Promise<void> {
  if (slot < 0 || slot > 9) {
    throw new Error('Save slot must be between 0 and 9')
  }

  const statePath = getStatePath(gameId, slot)
  const screenshotPath = getStateScreenshotPath(gameId, slot)

  try {
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath)
    }
    if (fs.existsSync(screenshotPath)) {
      fs.unlinkSync(screenshotPath)
    }
  } catch (error) {
    console.error('Failed to delete state:', error)
    throw error
  }
}

export async function listStates(gameId: string): Promise<SaveStateInfo[]> {
  const states: SaveStateInfo[] = []

  for (let slot = 0; slot <= 9; slot++) {
    const statePath = getStatePath(gameId, slot)
    const screenshotPath = getStateScreenshotPath(gameId, slot)

    if (fs.existsSync(statePath)) {
      try {
        const stats = fs.statSync(statePath)
        states.push({
          slot,
          exists: true,
          timestamp: stats.mtime.toISOString(),
          screenshotPath: fs.existsSync(screenshotPath) ? screenshotPath : undefined,
          size: stats.size
        })
      } catch {
        states.push({ slot, exists: false })
      }
    } else {
      states.push({ slot, exists: false })
    }
  }

  return states
}

export async function getStateScreenshot(gameId: string, slot: number): Promise<ArrayBuffer | null> {
  const screenshotPath = getStateScreenshotPath(gameId, slot)

  try {
    if (fs.existsSync(screenshotPath)) {
      const buffer = fs.readFileSync(screenshotPath)
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    }
  } catch (error) {
    console.error('Failed to load state screenshot:', error)
  }

  return null
}

// Register IPC handlers
export function registerSaveHandlers(): void {
  ipcMain.handle('saves:loadSRAM', async (_event, gameId: string) => {
    return await loadSRAM(gameId)
  })

  ipcMain.handle('saves:saveSRAM', async (_event, gameId: string, data: ArrayBuffer) => {
    await saveSRAM(gameId, data)
  })

  ipcMain.handle('saves:saveState', async (_event, gameId: string, slot: number, data: ArrayBuffer, screenshot?: ArrayBuffer) => {
    await saveState(gameId, slot, data, screenshot)
  })

  ipcMain.handle('saves:loadState', async (_event, gameId: string, slot: number) => {
    return await loadState(gameId, slot)
  })

  ipcMain.handle('saves:deleteState', async (_event, gameId: string, slot: number) => {
    await deleteState(gameId, slot)
  })

  ipcMain.handle('saves:listStates', async (_event, gameId: string) => {
    return await listStates(gameId)
  })

  ipcMain.handle('saves:getStateScreenshot', async (_event, gameId: string, slot: number) => {
    return await getStateScreenshot(gameId, slot)
  })
}
