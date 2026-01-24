import { ipcMain, BrowserWindow } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getConfigValue, setConfigValue } from './config'
import { getGame, updateGame } from './library'
import type { GameRecord } from './library'

let mainWindowRef: BrowserWindow | null = null

export function setEmulatorMainWindow(win: BrowserWindow | null): void {
  mainWindowRef = win
}

const PLATFORMS_WITH_CUE = ['ps1', 'saturn', 'dreamcast']

function resolveRomPath(game: GameRecord): string {
  const p = game.path
  const ext = path.extname(p).toLowerCase()
  if (ext !== '.bin' || !PLATFORMS_WITH_CUE.includes(game.platform)) {
    return p
  }
  const dir = path.dirname(p)
  const base = path.basename(p, ext)
  const cuePath = path.join(dir, base + '.cue')
  if (fs.existsSync(cuePath)) {
    return cuePath
  }
  return p
}

export interface LaunchContext {
  platform: string
  emulatorPath: string
}

export interface EmulatorDefinition {
  id: string
  name: string
  executable: string
  platforms: string[]
  defaultPaths: {
    win32: string[]
    darwin: string[]
    linux: string[]
  }
  launchArgs: (romPath: string, ctx?: LaunchContext) => string[]
  canInstall: boolean
  downloadUrl?: string
}

// RetroArch platform → core name (no extension). Cores live in {retroarch}/cores/.
const RETROARCH_CORE_BY_PLATFORM: Record<string, string> = {
  nes: 'fceumm_libretro',
  snes: 'snes9x_libretro',
  n64: 'mupen64plus_next_libretro',
  gb: 'gambatte_libretro',
  gbc: 'gambatte_libretro',
  gba: 'mgba_libretro',
  genesis: 'genesis_plus_gx_libretro',
  psp: 'ppsspp_libretro',
  ps1: 'beetle_psx_libretro',
  arcade: 'fbneo_libretro'
}

function getRetroArchCoreExt(): string {
  if (process.platform === 'win32') return '.dll'
  if (process.platform === 'darwin') return '.dylib'
  return '.so'
}

const EMULATOR_DEFINITIONS: EmulatorDefinition[] = [
  {
    id: 'retroarch',
    name: 'RetroArch',
    executable: process.platform === 'win32' ? 'retroarch.exe' : 'retroarch',
    platforms: ['nes', 'snes', 'n64', 'gb', 'gbc', 'gba', 'genesis', 'psp', 'ps1', 'arcade'],
    defaultPaths: {
      win32: [
        'C:\\RetroArch-Win64',
        'C:\\RetroArch',
        'C:\\Program Files\\RetroArch',
        'C:\\Program Files (x86)\\RetroArch',
        'C:\\ProgramData\\chocolatey\\bin',
        '%USERPROFILE%\\scoop\\apps\\retroarch\\current',
        '%LOCALAPPDATA%\\Programs'
      ],
      darwin: [
        '/Applications/RetroArch.app/Contents/MacOS',
        '~/Applications/RetroArch.app/Contents/MacOS',
        '/opt/homebrew/bin',
        '/usr/local/bin'
      ],
      linux: [
        '/usr/bin',
        '/usr/local/bin',
        '~/.local/bin',
        '/snap/bin',
        '~/bin',
        '~/Applications',
        '/var/lib/flatpak/app/org.libretro.RetroArch/current/active/files/bin'
      ]
    },
    launchArgs: (romPath: string, ctx?: LaunchContext) => {
      if (!ctx) return ['-L', 'auto', romPath]
      const coreName = RETROARCH_CORE_BY_PLATFORM[ctx.platform]
      if (!coreName) return ['-L', 'auto', romPath]
      const ext = getRetroArchCoreExt()
      const coresDir = path.join(path.dirname(ctx.emulatorPath), 'cores')
      const corePath = path.join(coresDir, coreName + ext)
      if (!fs.existsSync(corePath)) return ['-L', 'auto', romPath]
      return ['-L', corePath, romPath]
    },
    canInstall: true,
    downloadUrl: 'https://www.retroarch.com/?page=platforms'
  },
  {
    id: 'dolphin',
    name: 'Dolphin',
    executable: process.platform === 'win32' ? 'Dolphin.exe' : 'dolphin-emu',
    platforms: ['gamecube', 'wii'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\Dolphin-x64',
        'C:\\Program Files\\Dolphin',
        'C:\\Dolphin-x64',
        'C:\\Dolphin',
        'C:\\ProgramData\\chocolatey\\bin',
        '%USERPROFILE%\\scoop\\apps\\dolphin\\current',
        '%LOCALAPPDATA%\\Programs'
      ],
      darwin: [
        '/Applications/Dolphin.app/Contents/MacOS',
        '/opt/homebrew/bin',
        '/usr/local/bin'
      ],
      linux: [
        '/usr/bin',
        '/usr/local/bin',
        '~/.local/bin',
        '/snap/bin',
        '~/bin',
        '~/Applications',
        '/var/lib/flatpak/app/org.DolphinEmu.dolphin-emu/current/active/files/bin'
      ]
    },
    launchArgs: (romPath: string) => ['-e', romPath],
    canInstall: true,
    downloadUrl: 'https://dolphin-emu.org/download/'
  },
  {
    id: 'duckstation',
    name: 'DuckStation',
    executable: process.platform === 'win32' ? 'duckstation-qt-x64-ReleaseLTCG.exe' : 'duckstation-qt',
    platforms: ['ps1'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\DuckStation',
        'C:\\DuckStation',
        'C:\\ProgramData\\chocolatey\\bin',
        '%USERPROFILE%\\scoop\\apps\\duckstation\\current',
        '%LOCALAPPDATA%\\Programs'
      ],
      darwin: [
        '/Applications/DuckStation.app/Contents/MacOS',
        '/opt/homebrew/bin',
        '/usr/local/bin'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin',
        '/snap/bin',
        '~/bin',
        '~/Applications',
        '/var/lib/flatpak/app/org.duckstation.DuckStation/current/active/files/bin'
      ]
    },
    launchArgs: (romPath: string) => ['-batch', romPath],
    canInstall: true,
    downloadUrl: 'https://github.com/stenzek/duckstation/releases'
  },
  {
    id: 'pcsx2',
    name: 'PCSX2',
    executable: process.platform === 'win32' ? 'pcsx2-qt.exe' : 'pcsx2-qt',
    platforms: ['ps2'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\PCSX2',
        'C:\\Program Files (x86)\\PCSX2',
        'C:\\PCSX2',
        'C:\\ProgramData\\chocolatey\\bin',
        '%USERPROFILE%\\scoop\\apps\\pcsx2\\current',
        '%LOCALAPPDATA%\\Programs'
      ],
      darwin: [
        '/Applications/PCSX2.app/Contents/MacOS',
        '/opt/homebrew/bin',
        '/usr/local/bin'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin',
        '/snap/bin',
        '~/bin',
        '~/Applications',
        '/var/lib/flatpak/app/net.pcsx2.PCSX2/current/active/files/bin'
      ]
    },
    launchArgs: (romPath: string) => ['-batch', romPath],
    canInstall: true,
    downloadUrl: 'https://pcsx2.net/downloads/'
  },
  {
    id: 'rpcs3',
    name: 'RPCS3',
    executable: process.platform === 'win32' ? 'rpcs3.exe' : 'rpcs3',
    platforms: ['ps3'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\RPCS3',
        'C:\\RPCS3',
        'C:\\ProgramData\\chocolatey\\bin',
        '%USERPROFILE%\\scoop\\apps\\rpcs3\\current',
        '%LOCALAPPDATA%\\Programs'
      ],
      darwin: [
        '/Applications/RPCS3.app/Contents/MacOS',
        '/opt/homebrew/bin',
        '/usr/local/bin'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin',
        '/snap/bin',
        '~/bin',
        '~/Applications'
      ]
    },
    launchArgs: (romPath: string) => ['--no-gui', romPath],
    canInstall: true,
    downloadUrl: 'https://rpcs3.net/download'
  },
  {
    id: 'ryujinx',
    name: 'Ryujinx',
    executable: process.platform === 'win32' ? 'Ryujinx.exe' : 'Ryujinx',
    platforms: ['switch'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\Ryujinx',
        'C:\\Ryujinx',
        'C:\\ProgramData\\chocolatey\\bin',
        '%USERPROFILE%\\scoop\\apps\\ryujinx\\current',
        '%LOCALAPPDATA%\\Programs'
      ],
      darwin: [
        '/Applications/Ryujinx.app/Contents/MacOS',
        '/opt/homebrew/bin',
        '/usr/local/bin'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin',
        '/snap/bin',
        '~/bin',
        '~/Applications'
      ]
    },
    launchArgs: (romPath: string) => [romPath],
    canInstall: true,
    downloadUrl: 'https://github.com/GreemDev/Ryubing/releases'
  },
  {
    id: 'ppsspp',
    name: 'PPSSPP',
    executable: process.platform === 'win32' ? 'PPSSPPWindows64.exe' : 'ppsspp',
    platforms: ['psp'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\PPSSPP',
        'C:\\PPSSPP',
        'C:\\ProgramData\\chocolatey\\bin',
        '%USERPROFILE%\\scoop\\apps\\ppsspp\\current',
        '%LOCALAPPDATA%\\Programs'
      ],
      darwin: [
        '/Applications/PPSSPP.app/Contents/MacOS',
        '/opt/homebrew/bin',
        '/usr/local/bin'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin',
        '/snap/bin',
        '~/bin',
        '~/Applications',
        '/var/lib/flatpak/app/org.ppsspp.PPSSPP/current/active/files/bin'
      ]
    },
    launchArgs: (romPath: string) => [romPath],
    canInstall: true,
    downloadUrl: 'https://www.ppsspp.org/downloads.html'
  }
]

function expandPath(p: string): string {
  let out = p
  if (out.startsWith('~')) {
    out = path.join(process.env.HOME || process.env.USERPROFILE || '', out.slice(1))
  }
  if (process.platform === 'win32' && out.includes('%')) {
    out = out.replace(/%([^%]+)%/g, (_, k) => process.env[k] ?? '')
  }
  return out
}

function isEmulatorEnabled(emulatorId: string): boolean {
  const enabled = getConfigValue('emulatorEnabled') as Record<string, boolean> | undefined
  if (!enabled || !(emulatorId in enabled)) return true
  return enabled[emulatorId] !== false
}

export function detectEmulator(definition: EmulatorDefinition): string | null {
  // Check if user has configured a custom path
  const emulatorPaths = getConfigValue('emulatorPaths')
  if (emulatorPaths[definition.id]) {
    const customPath = emulatorPaths[definition.id]
    if (fs.existsSync(customPath)) {
      return customPath
    }
  }

  // Check default paths for current platform
  const platform = process.platform as 'win32' | 'darwin' | 'linux'
  const searchPaths = definition.defaultPaths[platform] || []

  for (const basePath of searchPaths) {
    const expanded = expandPath(basePath)
    const fullPath = path.join(expanded, definition.executable)

    if (fs.existsSync(fullPath)) {
      return fullPath
    }

    // Also check if the base path itself is the executable
    if (fs.existsSync(expanded) && expanded.endsWith(definition.executable)) {
      return expanded
    }
  }

  return null
}

export function detectAllEmulators(): Array<{
  id: string
  name: string
  path: string | null
  platforms: string[]
  installed: boolean
  enabled: boolean
  canInstall: boolean
  downloadUrl: string | null
}> {
  return EMULATOR_DEFINITIONS.map(def => {
    const detectedPath = detectEmulator(def)
    return {
      id: def.id,
      name: def.name,
      path: detectedPath,
      platforms: def.platforms,
      installed: detectedPath !== null,
      enabled: isEmulatorEnabled(def.id),
      canInstall: def.canInstall,
      downloadUrl: def.downloadUrl || null
    }
  })
}

export function getEmulatorForPlatform(platform: string): EmulatorDefinition | null {
  const defaults = getConfigValue('defaultEmulatorPerPlatform') as Record<string, string> | undefined
  const preferredId = defaults?.[platform]
  if (preferredId) {
    const def = EMULATOR_DEFINITIONS.find(d => d.id === preferredId)
    if (def && def.platforms.includes(platform) && isEmulatorEnabled(def.id) && detectEmulator(def)) {
      return def
    }
  }
  for (const def of EMULATOR_DEFINITIONS) {
    if (def.platforms.includes(platform) && isEmulatorEnabled(def.id) && detectEmulator(def)) {
      return def
    }
  }
  return null
}

export async function launchGame(gameId: string, emulatorId?: string): Promise<void> {
  const game = getGame(gameId)
  if (!game) {
    throw new Error(`Game not found: ${gameId}`)
  }

  let emulatorDef: EmulatorDefinition | null = null
  let emulatorPath: string | null = null
  const preferredId = emulatorId ?? game.preferredEmulator

  if (preferredId) {
    emulatorDef = EMULATOR_DEFINITIONS.find(d => d.id === preferredId) ?? null
    if (emulatorDef) {
      if (!isEmulatorEnabled(emulatorDef.id)) {
        emulatorDef = null
      } else {
        emulatorPath = detectEmulator(emulatorDef)
      }
    }
    if (!emulatorPath && emulatorDef) {
      throw new Error(`Emulator ${emulatorDef.name} not installed or path invalid. Configure in Settings → Emulators.`)
    }
  }

  if (!emulatorDef || !emulatorPath) {
    emulatorDef = getEmulatorForPlatform(game.platform)
    if (emulatorDef) {
      emulatorPath = detectEmulator(emulatorDef)
    }
  }

  if (!emulatorDef || !emulatorPath) {
    throw new Error(`No emulator found for platform: ${game.platform}. Add one in Settings → Emulators.`)
  }

  const romPath = resolveRomPath(game)
  if (!fs.existsSync(romPath)) {
    throw new Error('ROM file not found. It may have been moved or deleted.')
  }

  const ctx: LaunchContext = { platform: game.platform, emulatorPath }
  const args = emulatorDef.launchArgs(romPath, ctx)
  const cwd = path.dirname(emulatorPath)
  const startTime = Date.now()

  return new Promise((resolve, reject) => {
    const child = spawn(emulatorPath!, args, {
      detached: true,
      stdio: 'ignore',
      cwd,
      env: { ...process.env }
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.on('spawn', () => {
      resolve()
    })

    child.on('exit', () => {
      const elapsedMs = Date.now() - startTime
      const durationMinutes = Math.max(0, Math.floor(elapsedMs / 60_000))
      const g = getGame(gameId)
      if (g) {
        const existing = g.playTime ?? 0
        updateGame(gameId, { playTime: existing + durationMinutes })
      }
      mainWindowRef?.webContents?.send('emulators:playSessionEnded', {
        gameId,
        durationMinutes
      })
      child.unref()
    })
  })
}

// Register IPC handlers
export function registerEmulatorHandlers(): void {
  ipcMain.handle('emulators:detect', () => {
    return detectAllEmulators()
  })

  ipcMain.handle('emulators:getInstalled', () => {
    return detectAllEmulators().filter(e => e.installed)
  })

  ipcMain.handle('emulators:getPlatformsWithEmulator', () => {
    const platforms = new Set<string>()
    for (const def of EMULATOR_DEFINITIONS) {
      if (!isEmulatorEnabled(def.id) || !detectEmulator(def)) continue
      for (const p of def.platforms) platforms.add(p)
    }
    return [...platforms]
  })

  ipcMain.handle('emulators:launch', async (_event, gameId: string, emulatorId?: string) => {
    await launchGame(gameId, emulatorId)
  })

  ipcMain.handle('emulators:configure', (_event, emulatorId: string, config: Record<string, unknown>) => {
    const emulatorPaths = getConfigValue('emulatorPaths') as Record<string, string>
    if (config.clear === true || config.path === null) {
      const next = { ...emulatorPaths }
      delete next[emulatorId]
      setConfigValue('emulatorPaths', next)
      return
    }
    if (typeof config.path === 'string') {
      setConfigValue('emulatorPaths', { ...emulatorPaths, [emulatorId]: config.path as string })
    }
  })

  ipcMain.handle('emulators:openSettings', async (_event, emulatorId: string) => {
    const def = EMULATOR_DEFINITIONS.find(d => d.id === emulatorId)
    if (!def) return
    const emulatorPath = detectEmulator(def)
    if (!emulatorPath) return
    const cwd = path.dirname(emulatorPath)
    const child = spawn(emulatorPath, [], {
      detached: true,
      stdio: 'ignore',
      cwd,
      env: { ...process.env }
    })
    child.unref()
  })

  ipcMain.handle('emulators:getVersion', async (_event, emulatorId: string): Promise<string> => {
    const def = EMULATOR_DEFINITIONS.find(d => d.id === emulatorId)
    if (!def) return 'Unknown'
    const emulatorPath = detectEmulator(def)
    if (!emulatorPath) return 'Unknown'
    return new Promise(resolve => {
      let settled = false
      const finish = (v: string) => {
        if (settled) return
        settled = true
        clearTimeout(tid)
        resolve(v)
      }
      const child = spawn(emulatorPath, ['--version'], {
        cwd: path.dirname(emulatorPath),
        stdio: ['ignore', 'pipe', 'pipe']
      })
      let out = ''
      child.stdout?.on('data', (c: Buffer) => { out += c.toString() })
      child.stderr?.on('data', (c: Buffer) => { out += c.toString() })
      const tid = setTimeout(() => {
        try { child.kill('SIGKILL') } catch { /* already exited */ }
        finish('Unknown')
      }, 3000)
      child.on('error', () => finish('Unknown'))
      child.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          finish('Unknown')
          return
        }
        const first = out.split(/\r?\n/)[0]?.trim() ?? ''
        const match = first.match(/(\d+\.\d+[\d.-]*)/)
        finish(match ? match[1] : first.slice(0, 32) || 'Unknown')
      })
    })
  })
}
