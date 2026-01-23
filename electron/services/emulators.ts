import { ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getConfigValue, setConfigValue } from './config'
import { getGame } from './library'

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
  launchArgs: (romPath: string) => string[]
  canInstall: boolean
  downloadUrl?: string
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
        'C:\\Program Files (x86)\\RetroArch'
      ],
      darwin: [
        '/Applications/RetroArch.app/Contents/MacOS',
        '~/Applications/RetroArch.app/Contents/MacOS'
      ],
      linux: [
        '/usr/bin',
        '/usr/local/bin',
        '~/.local/bin',
        '/var/lib/flatpak/app/org.libretro.RetroArch/current/active/files/bin'
      ]
    },
    launchArgs: (romPath: string) => ['-L', 'auto', romPath],
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
        'C:\\Dolphin'
      ],
      darwin: [
        '/Applications/Dolphin.app/Contents/MacOS'
      ],
      linux: [
        '/usr/bin',
        '/usr/local/bin',
        '~/.local/bin',
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
        'C:\\DuckStation'
      ],
      darwin: [
        '/Applications/DuckStation.app/Contents/MacOS'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin',
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
        'C:\\PCSX2'
      ],
      darwin: [
        '/Applications/PCSX2.app/Contents/MacOS'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin',
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
        'C:\\RPCS3'
      ],
      darwin: [
        '/Applications/RPCS3.app/Contents/MacOS'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin'
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
        'C:\\Ryujinx'
      ],
      darwin: [
        '/Applications/Ryujinx.app/Contents/MacOS'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin'
      ]
    },
    launchArgs: (romPath: string) => [romPath],
    canInstall: true,
    downloadUrl: 'https://ryujinx.org/download'
  },
  {
    id: 'ppsspp',
    name: 'PPSSPP',
    executable: process.platform === 'win32' ? 'PPSSPPWindows64.exe' : 'ppsspp',
    platforms: ['psp'],
    defaultPaths: {
      win32: [
        'C:\\Program Files\\PPSSPP',
        'C:\\PPSSPP'
      ],
      darwin: [
        '/Applications/PPSSPP.app/Contents/MacOS'
      ],
      linux: [
        '/usr/bin',
        '~/.local/bin',
        '/var/lib/flatpak/app/org.ppsspp.PPSSPP/current/active/files/bin'
      ]
    },
    launchArgs: (romPath: string) => [romPath],
    canInstall: true,
    downloadUrl: 'https://www.ppsspp.org/downloads.html'
  }
]

function expandPath(p: string): string {
  if (p.startsWith('~')) {
    return path.join(process.env.HOME || process.env.USERPROFILE || '', p.slice(1))
  }
  return p
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
  canInstall: boolean
}> {
  return EMULATOR_DEFINITIONS.map(def => ({
    id: def.id,
    name: def.name,
    path: detectEmulator(def),
    platforms: def.platforms,
    installed: detectEmulator(def) !== null,
    canInstall: def.canInstall
  }))
}

export function getEmulatorForPlatform(platform: string): EmulatorDefinition | null {
  // Find first installed emulator that supports this platform
  for (const def of EMULATOR_DEFINITIONS) {
    if (def.platforms.includes(platform) && detectEmulator(def)) {
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

  if (emulatorId) {
    emulatorDef = EMULATOR_DEFINITIONS.find(d => d.id === emulatorId) || null
    if (emulatorDef) {
      emulatorPath = detectEmulator(emulatorDef)
    }
  }

  if (!emulatorDef || !emulatorPath) {
    emulatorDef = getEmulatorForPlatform(game.platform)
    if (emulatorDef) {
      emulatorPath = detectEmulator(emulatorDef)
    }
  }

  if (!emulatorDef || !emulatorPath) {
    throw new Error(`No emulator found for platform: ${game.platform}`)
  }

  const args = emulatorDef.launchArgs(game.path)

  return new Promise((resolve, reject) => {
    const child = spawn(emulatorPath!, args, {
      detached: true,
      stdio: 'ignore'
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.unref()
    resolve()
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

  ipcMain.handle('emulators:launch', async (_event, gameId: string, emulatorId?: string) => {
    await launchGame(gameId, emulatorId)
  })

  ipcMain.handle('emulators:configure', (_event, emulatorId: string, config: Record<string, unknown>) => {
    const emulatorPaths = getConfigValue('emulatorPaths')
    if (config.path) {
      emulatorPaths[emulatorId] = config.path as string
      setConfigValue('emulatorPaths', emulatorPaths)
    }
  })
}
