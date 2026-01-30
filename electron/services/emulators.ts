import { ipcMain, BrowserWindow, app } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getConfigValue, setConfigValue } from './config'
import { getGame, updateGame } from './library'
import type { GameRecord } from './library'
import { configureDolphinController, getDolphinConfigPath, hasDolphinConfig, type ControllerType } from './dolphinConfig'

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
  noVersionCheck?: boolean
}

// RetroArch platform → core name (no extension). We try {retroarch}/cores/ first (Windows
// standalone); if not found, we use -L auto so RetroArch finds cores in system dirs
// (e.g. /usr/lib/libretro/, ~/Library/Application Support/RetroArch/cores/).
const RETROARCH_CORE_BY_PLATFORM: Record<string, string> = {
  nes: 'fceumm_libretro',
  snes: 'snes9x_libretro',
  n64: 'mupen64plus_next_libretro',
  gb: 'gambatte_libretro',
  gbc: 'gambatte_libretro',
  gba: 'mgba_libretro',
  genesis: 'genesis_plus_gx_libretro',
  psp: 'ppsspp_libretro',
  nds: 'desmume_libretro',
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
    platforms: ['nes', 'snes', 'n64', 'gb', 'gbc', 'gba', 'nds', 'genesis', 'psp', 'ps1', 'arcade'],
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
      if (!ctx) return ['--fullscreen', '-L', 'auto', romPath]
      const coreName = RETROARCH_CORE_BY_PLATFORM[ctx.platform]
      if (!coreName) return ['--fullscreen', '-L', 'auto', romPath]
      const ext = getRetroArchCoreExt()
      const coresDir = path.join(path.dirname(ctx.emulatorPath), 'cores')
      const corePath = path.join(coresDir, coreName + ext)
      if (!fs.existsSync(corePath)) return ['--fullscreen', '-L', 'auto', romPath]
      return ['--fullscreen', '-L', corePath, romPath]
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
    launchArgs: (romPath: string) => ['-b', '-e', romPath],
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
    launchArgs: (romPath: string) => ['-batch', '-fullscreen', romPath],
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
    launchArgs: (romPath: string) => ['-batch', '-fullscreen', romPath],
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
    launchArgs: (romPath: string) => ['--no-gui', '--fullscreen', romPath],
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
    launchArgs: (romPath: string) => ['--fullscreen', romPath],
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
    launchArgs: (romPath: string) => ['--fullscreen', romPath],
    canInstall: true,
    downloadUrl: 'https://www.ppsspp.org/downloads.html'
  },
  {
    id: 'xemu',
    name: 'xemu',
    executable: process.platform === 'win32' ? 'xemu.exe' : 'xemu',
    platforms: ['xbox'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\xemu',
        'C:\\xemu',
        '%LOCALAPPDATA%\\Programs\\xemu',
        '%USERPROFILE%\\scoop\\apps\\xemu\\current'
      ],
      darwin: [
        '/Applications/xemu.app/Contents/MacOS',
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
        '/var/lib/flatpak/app/app.xemu.xemu/current/active/files/bin'
      ]
    },
    launchArgs: (romPath: string) => ['-dvd_path', romPath],
    canInstall: true,
    downloadUrl: 'https://xemu.app/#download',
    noVersionCheck: true
  },
  {
    id: 'azahar',
    name: 'Azahar',
    executable: process.platform === 'win32' ? 'azahar.exe' : 'azahar',
    platforms: ['3ds'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\Azahar',
        'C:\\Azahar',
        '%LOCALAPPDATA%\\Programs\\Azahar',
        '%USERPROFILE%\\scoop\\apps\\azahar\\current'
      ],
      darwin: [
        '/Applications/Azahar.app/Contents/MacOS',
        '/opt/homebrew/bin',
        '/usr/local/bin'
      ],
      linux: [
        '/usr/bin',
        '/usr/local/bin',
        '~/.local/bin',
        '~/bin',
        '~/Applications'
      ]
    },
    launchArgs: (romPath: string) => ['-f', romPath],
    canInstall: true,
    downloadUrl: 'https://azahar-emu.org/'
  },
  {
    id: 'xenia',
    name: 'Xenia',
    executable: process.platform === 'win32' ? 'xenia.exe' : 'xenia',
    platforms: ['xbox360'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\Xenia',
        'C:\\Xenia',
        '%LOCALAPPDATA%\\Programs\\Xenia',
        '%USERPROFILE%\\scoop\\apps\\xenia\\current'
      ],
      darwin: [],
      linux: []
    },
    launchArgs: (romPath: string) => [romPath],
    canInstall: true,
    downloadUrl: 'https://xenia.jp/download/',
    noVersionCheck: true
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
    throw new Error(`No emulator configured for ${game.platform}. Set one under Consoles → ${game.platform.toUpperCase()}.`)
  }

  // RetroArch: We do not validate core paths here. Cores may live in {retroarch}/cores/ (Windows
  // standalone), /usr/lib/libretro/, ~/Library/Application Support/RetroArch/cores/, etc. The
  // launchArgs logic uses -L <core> when the core exists next to the executable, otherwise -L auto,
  // which lets RetroArch find cores in system-wide and config directories.

  // Check for RPCS3 firmware
  if (emulatorDef.id === 'rpcs3') {
    const rpcs3Dir = path.dirname(emulatorPath)
    const devFlash = path.join(rpcs3Dir, 'dev_flash')
    const appDataDir = app.getPath('appData')
    const devFlashAlt = path.join(appDataDir, 'rpcs3', 'dev_flash')
    if (!fs.existsSync(devFlash) && !fs.existsSync(devFlashAlt)) {
      throw new Error(
        `RPCS3 firmware not installed.\n\n` +
        `PS3 games require the official PlayStation 3 firmware to run.\n\n` +
        `To install: Download firmware from the PlayStation website, then in RPCS3 go to File → Install Firmware.`
      )
    }
  }

  // Check for xemu BIOS files
  if (emulatorDef.id === 'xemu') {
    const biosPaths = getConfigValue('biosPaths') as Record<string, string>
    const missing: string[] = []
    if (!biosPaths['xbox-mcpx'] || !fs.existsSync(biosPaths['xbox-mcpx'])) missing.push('Xbox MCPX Boot ROM')
    if (!biosPaths['xbox-bios'] || !fs.existsSync(biosPaths['xbox-bios'])) missing.push('Xbox Flash ROM (BIOS)')
    if (!biosPaths['xbox-hdd'] || !fs.existsSync(biosPaths['xbox-hdd'])) missing.push('Xbox HDD Image')
    if (missing.length > 0) {
      throw new Error(
        `Xbox BIOS files not configured: ${missing.join(', ')}.\n\n` +
        `xemu requires MCPX Boot ROM, Flash ROM, and HDD Image to run.\n\n` +
        `Open xemu and configure these files in its Settings → System, then set the paths in EasyEmu Settings → BIOS Files.`
      )
    }
  }

  const romPath = resolveRomPath(game)
  if (!fs.existsSync(romPath)) {
    throw new Error('ROM file not found. It may have been moved or deleted.')
  }

  // Auto-configure Dolphin controller if launching a GameCube/Wii game
  if (emulatorDef.id === 'dolphin') {
    // Get the configured controller type from config, default to 'xbox' (most common)
    const controllerType = (getConfigValue('dolphinControllerType') as ControllerType) || 'xbox'
    // Get the stored device name (for Bluetooth controllers like "Xbox Wireless Controller")
    const deviceName = getConfigValue('dolphinDeviceName') as string | undefined
    const configResult = configureDolphinController(controllerType, deviceName)
    if (!configResult.success) {
      console.warn('[Emulators] Failed to configure Dolphin controller:', configResult.error)
      // Continue anyway - Dolphin may still work with existing config
    }
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
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('emulators:playSessionEnded', {
          gameId,
          durationMinutes
        })
      }
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
    const list: string[] = []
    platforms.forEach(platform => list.push(platform))
    return list
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
    if (def.noVersionCheck) return 'Installed'
    const emulatorPath = detectEmulator(def)
    if (!emulatorPath) return 'Unknown'
    // Skip version check for emulators that don't support --version flag
    if (def.supportsVersion === false) return 'Installed'
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

  // Dolphin controller configuration handlers
  ipcMain.handle('emulators:configureDolphinController', (_event, controllerType: ControllerType, deviceName?: string) => {
    // Store the controller type preference
    setConfigValue('dolphinControllerType', controllerType)
    // Store the device name if provided (for Bluetooth controllers)
    if (deviceName) {
      setConfigValue('dolphinDeviceName', deviceName)
    }
    // Apply the configuration immediately with the actual device name
    return configureDolphinController(controllerType, deviceName)
  })

  ipcMain.handle('emulators:getDolphinControllerType', () => {
    return (getConfigValue('dolphinControllerType') as ControllerType) || 'xbox'
  })

  ipcMain.handle('emulators:getDolphinConfigPath', () => {
    return getDolphinConfigPath()
  })

  ipcMain.handle('emulators:hasDolphinConfig', () => {
    return hasDolphinConfig()
  })
}
