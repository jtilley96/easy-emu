import { ipcMain, BrowserWindow, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { getGame, updateGame } from './library'
import { canPlayWithEmbedded, getCorePaths } from './cores'
import { getConfigValue } from './config'

let mainWindowRef: BrowserWindow | null = null

export function setEmbeddedMainWindow(win: BrowserWindow | null): void {
  mainWindowRef = win
}

// Track active play sessions
const activeSessions: Map<string, { startTime: number }> = new Map()

export interface EmbeddedPlayCapability {
  canPlay: boolean
  reason?: string
  coreName?: string
}

export function checkCanPlayEmbedded(platform: string): EmbeddedPlayCapability {
  const preferEmbedded = getConfigValue('preferEmbedded') ?? true

  if (!preferEmbedded) {
    return {
      canPlay: false,
      reason: 'Embedded emulation is disabled in settings'
    }
  }

  const corePaths = getCorePaths(platform)
  if (!corePaths) {
    return {
      canPlay: false,
      reason: `No embedded core installed for ${platform}`
    }
  }

  // Verify data file exists
  if (!fs.existsSync(corePaths.dataPath)) {
    return {
      canPlay: false,
      reason: 'Core data file is missing. Please reinstall the core.'
    }
  }

  return {
    canPlay: true,
    coreName: corePaths.coreName
  }
}

export async function startSession(gameId: string): Promise<{ success: boolean; error?: string }> {
  const game = getGame(gameId)
  if (!game) {
    return { success: false, error: 'Game not found' }
  }

  const capability = checkCanPlayEmbedded(game.platform)
  if (!capability.canPlay) {
    return { success: false, error: capability.reason }
  }

  // Check ROM file exists
  if (!fs.existsSync(game.path)) {
    return { success: false, error: 'ROM file not found' }
  }

  // Start tracking session
  activeSessions.set(gameId, { startTime: Date.now() })

  // Update last played
  await updateGame(gameId, { lastPlayed: new Date().toISOString() })

  return { success: true }
}

export async function endSession(gameId: string, playTimeMs?: number): Promise<void> {
  const session = activeSessions.get(gameId)
  let durationMinutes = 0

  if (session) {
    const elapsedMs = playTimeMs ?? (Date.now() - session.startTime)
    durationMinutes = Math.max(0, Math.floor(elapsedMs / 60_000))
    activeSessions.delete(gameId)
  } else if (playTimeMs) {
    durationMinutes = Math.max(0, Math.floor(playTimeMs / 60_000))
  }

  // Update play time
  const game = getGame(gameId)
  if (game) {
    const existingTime = game.playTime ?? 0
    await updateGame(gameId, { playTime: existingTime + durationMinutes })
  }

  // Notify renderer of session end
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('embedded:sessionEnded', {
      gameId,
      durationMinutes
    })
  }
}

export function getGameRomPath(gameId: string): string | null {
  const game = getGame(gameId)
  return game?.path ?? null
}

export function getGameInfo(gameId: string): { path: string; platform: string; title: string } | null {
  const game = getGame(gameId)
  if (!game) return null

  return {
    path: game.path,
    platform: game.platform,
    title: game.title
  }
}

// Platform to EmulatorJS system mapping
const PLATFORM_TO_SYSTEM: Record<string, string> = {
  nes: 'nes',
  snes: 'snes',
  n64: 'n64',
  gb: 'gb',
  gbc: 'gbc',
  gba: 'gba',
  genesis: 'segaMD',
  megadrive: 'segaMD',
  sms: 'segaMS',
  gamegear: 'segaGG',
  ps1: 'psx',
  psx: 'psx'
}

export function getEmulatorJSSystem(platform: string): string {
  return PLATFORM_TO_SYSTEM[platform] || platform
}

// Register IPC handlers
export function registerEmbeddedHandlers(): void {
  ipcMain.handle('embedded:canPlay', (_event, platform: string) => {
    return checkCanPlayEmbedded(platform)
  })

  ipcMain.handle('embedded:getCorePaths', (_event, platform: string) => {
    const paths = getCorePaths(platform)
    console.log('[Embedded] getCorePaths:', platform, paths || 'no core installed')
    return paths
  })

  ipcMain.handle('embedded:startSession', async (_event, gameId: string) => {
    return await startSession(gameId)
  })

  ipcMain.handle('embedded:endSession', async (_event, gameId: string, playTimeMs?: number) => {
    await endSession(gameId, playTimeMs)
  })

  ipcMain.handle('embedded:getGameRomPath', (_event, gameId: string) => {
    return getGameRomPath(gameId)
  })

  ipcMain.handle('embedded:getGameInfo', (_event, gameId: string) => {
    const info = getGameInfo(gameId)
    console.log('[Embedded] getGameInfo:', gameId, info ? { platform: info.platform, title: info.title } : 'not found')
    return info
  })

  ipcMain.handle('embedded:getGameRomData', (_event, gameId: string) => {
    console.log('[Embedded] getGameRomData:', gameId)
    const game = getGame(gameId)
    if (!game) {
      console.error('[Embedded] Game not found:', gameId)
      return null
    }
    console.log('[Embedded] ROM path:', game.path)
    if (!fs.existsSync(game.path)) {
      console.error('[Embedded] ROM file does not exist:', game.path)
      return null
    }
    try {
      // Return ROM file as Uint8Array (better IPC serialization than ArrayBuffer)
      const buffer = fs.readFileSync(game.path)
      console.log('[Embedded] ROM loaded successfully:', buffer.length, 'bytes')
      return new Uint8Array(buffer)
    } catch (err) {
      console.error('[Embedded] Failed to read ROM file:', err)
      return null
    }
  })

  ipcMain.handle('embedded:getSystem', (_event, platform: string) => {
    return getEmulatorJSSystem(platform)
  })

  ipcMain.handle('embedded:getCoresPath', () => {
    return path.join(app.getPath('userData'), 'cores')
  })

  ipcMain.handle('embedded:getConfig', () => {
    return {
      preferEmbedded: getConfigValue('preferEmbedded') ?? true,
      embeddedShader: getConfigValue('embeddedShader') ?? 'none',
      embeddedIntegerScaling: getConfigValue('embeddedIntegerScaling') ?? true
    }
  })
}
