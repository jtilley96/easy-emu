import { ipcMain } from 'electron'
import fs from 'fs'
import { getConfigValue, setConfigValue } from './config'

export interface BiosDefinition {
  id: string
  name: string
  description: string
  platform: string
  required: boolean
  filenames: string[]
}

export interface BiosStatus {
  id: string
  name: string
  description: string
  platform: string
  required: boolean
  found: boolean
  path: string | null
}

const BIOS_DEFINITIONS: BiosDefinition[] = [
  {
    id: 'ps1',
    name: 'PS1 BIOS',
    description: 'Required for DuckStation/RetroArch PS1 emulation',
    platform: 'ps1',
    required: true,
    filenames: ['scph1001.bin', 'scph5501.bin', 'scph7001.bin', 'scph5500.bin', 'scph5502.bin']
  },
  {
    id: 'ps2',
    name: 'PS2 BIOS',
    description: 'Required for PCSX2',
    platform: 'ps2',
    required: true,
    filenames: ['bios.bin', 'ps2-bios.bin', 'scph10000.bin', 'scph39001.bin', 'scph70012.bin']
  },
  {
    id: 'gba',
    name: 'GBA BIOS',
    description: 'Optional for mGBA/RetroArch (improves compatibility)',
    platform: 'gba',
    required: false,
    filenames: ['gba_bios.bin', 'gba.bin']
  },
  {
    id: 'nds-arm7',
    name: 'NDS ARM7 BIOS',
    description: 'Required for melonDS',
    platform: 'nds',
    required: true,
    filenames: ['bios7.bin', 'biosnds7.bin']
  },
  {
    id: 'nds-arm9',
    name: 'NDS ARM9 BIOS',
    description: 'Required for melonDS',
    platform: 'nds',
    required: true,
    filenames: ['bios9.bin', 'biosnds9.bin']
  },
  {
    id: 'nds-firmware',
    name: 'NDS Firmware',
    description: 'Required for melonDS',
    platform: 'nds',
    required: true,
    filenames: ['firmware.bin', 'nds_firmware.bin']
  },
  {
    id: '3ds-aeskeys',
    name: '3DS AES Keys',
    description: 'Optional for Azahar (needed for encrypted ROMs on older builds)',
    platform: '3ds',
    required: false,
    filenames: ['aes_keys.txt', 'aes_keys.bin']
  },
  {
    id: 'xbox-mcpx',
    name: 'Xbox MCPX Boot ROM',
    description: 'Required for xemu',
    platform: 'xbox',
    required: true,
    filenames: ['mcpx_1.0.bin', 'mcpx.bin']
  },
  {
    id: 'xbox-flash',
    name: 'Xbox Flash BIOS',
    description: 'Required for xemu',
    platform: 'xbox',
    required: true,
    filenames: ['Complex_4627.bin', 'complex.bin', 'xbox_flash.bin']
  },
  {
    id: 'xbox-hdd',
    name: 'Xbox HDD Image',
    description: 'Required for xemu',
    platform: 'xbox',
    required: true,
    filenames: ['xbox_hdd.qcow2']
  }
]

export function getBiosDefinitions(): BiosDefinition[] {
  return BIOS_DEFINITIONS
}

export function checkBiosStatus(): BiosStatus[] {
  const biosPaths = getConfigValue('biosPaths') as Record<string, string>

  return BIOS_DEFINITIONS.map(def => {
    const configuredPath = biosPaths[def.id]
    const found = configuredPath ? fs.existsSync(configuredPath) : false

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      platform: def.platform,
      required: def.required,
      found,
      path: found ? configuredPath : null
    }
  })
}

export function setBiosPath(biosId: string, path: string): void {
  const biosPaths = getConfigValue('biosPaths') as Record<string, string>
  biosPaths[biosId] = path
  setConfigValue('biosPaths', biosPaths)
}

export function registerBiosHandlers(): void {
  ipcMain.handle('bios:getDefinitions', () => {
    return getBiosDefinitions()
  })

  ipcMain.handle('bios:checkStatus', () => {
    return checkBiosStatus()
  })

  ipcMain.handle('bios:setPath', (_event, biosId: string, path: string) => {
    setBiosPath(biosId, path)
    return checkBiosStatus()
  })
}
