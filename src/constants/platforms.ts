import { Platform } from '../types'

export const PLATFORMS: Platform[] = [
  {
    id: 'nes',
    name: 'Nintendo Entertainment System',
    shortName: 'NES',
    icon: '🎮',
    extensions: ['.nes', '.nez', '.unf', '.unif'],
    emulators: ['retroarch']
  },
  {
    id: 'snes',
    name: 'Super Nintendo',
    shortName: 'SNES',
    icon: '🎮',
    extensions: ['.sfc', '.smc', '.fig', '.swc'],
    emulators: ['retroarch']
  },
  {
    id: 'n64',
    name: 'Nintendo 64',
    shortName: 'N64',
    icon: '🎮',
    extensions: ['.n64', '.z64', '.v64'],
    emulators: ['retroarch']
  },
  {
    id: 'gamecube',
    name: 'Nintendo GameCube',
    shortName: 'GC',
    icon: '🎮',
    extensions: ['.iso', '.gcm', '.gcz', '.rvz'],
    emulators: ['dolphin']
  },
  {
    id: 'wii',
    name: 'Nintendo Wii',
    shortName: 'Wii',
    icon: '🎮',
    extensions: ['.iso', '.wbfs', '.rvz', '.wia'],
    emulators: ['dolphin']
  },
  {
    id: 'switch',
    name: 'Nintendo Switch',
    shortName: 'Switch',
    icon: '🎮',
    extensions: ['.nsp', '.xci', '.nca'],
    emulators: ['ryujinx']
  },
  {
    id: 'gb',
    name: 'Game Boy',
    shortName: 'GB',
    icon: '🎮',
    extensions: ['.gb'],
    emulators: ['retroarch']
  },
  {
    id: 'gbc',
    name: 'Game Boy Color',
    shortName: 'GBC',
    icon: '🎮',
    extensions: ['.gbc'],
    emulators: ['retroarch']
  },
  {
    id: 'gba',
    name: 'Game Boy Advance',
    shortName: 'GBA',
    icon: '🎮',
    extensions: ['.gba'],
    emulators: ['retroarch']
  },
  {
    id: 'nds',
    name: 'Nintendo DS',
    shortName: 'NDS',
    icon: '🎮',
    extensions: ['.nds', '.dsi'],
    emulators: ['retroarch']
  },
  {
    id: '3ds',
    name: 'Nintendo 3DS',
    shortName: '3DS',
    icon: '🎮',
    extensions: ['.3ds', '.cia', '.cxi'],
    emulators: ['azahar']
  },
  {
    id: 'genesis',
    name: 'Sega Genesis / Mega Drive',
    shortName: 'Genesis',
    icon: '🎮',
    extensions: ['.md', '.gen', '.bin', '.smd'],
    emulators: ['retroarch']
  },
  {
    id: 'saturn',
    name: 'Sega Saturn',
    shortName: 'Saturn',
    icon: '🎮',
    extensions: ['.iso', '.bin', '.cue'],
    emulators: ['retroarch']
  },
  {
    id: 'dreamcast',
    name: 'Sega Dreamcast',
    shortName: 'DC',
    icon: '🎮',
    extensions: ['.gdi', '.cdi', '.chd'],
    emulators: ['retroarch']
  },
  {
    id: 'ps1',
    name: 'PlayStation',
    shortName: 'PS1',
    icon: '🎮',
    extensions: ['.bin', '.cue', '.iso', '.img', '.pbp', '.chd'],
    emulators: ['duckstation']
  },
  {
    id: 'ps2',
    name: 'PlayStation 2',
    shortName: 'PS2',
    icon: '🎮',
    extensions: ['.iso', '.bin', '.chd', '.cso', '.gz'],
    emulators: ['pcsx2']
  },
  {
    id: 'ps3',
    name: 'PlayStation 3',
    shortName: 'PS3',
    icon: '🎮',
    extensions: ['.pkg', '.iso'],
    emulators: ['rpcs3']
  },
  {
    id: 'psp',
    name: 'PlayStation Portable',
    shortName: 'PSP',
    icon: '🎮',
    extensions: ['.iso', '.cso', '.pbp'],
    emulators: ['ppsspp']
  },
  {
    id: 'xbox',
    name: 'Xbox',
    shortName: 'Xbox',
    icon: '🎮',
    extensions: ['.iso', '.xiso'],
    emulators: ['xemu']
  },
  {
    id: 'xbox360',
    name: 'Xbox 360',
    shortName: 'X360',
    icon: '🎮',
    extensions: ['.iso', '.xex', '.zar'],
    emulators: ['xenia']
  },
  {
    id: 'arcade',
    name: 'Arcade',
    shortName: 'Arcade',
    icon: '🕹️',
    extensions: ['.zip', '.7z'],
    emulators: ['retroarch']
  }
]

// Map file extensions to platforms
export const EXTENSION_TO_PLATFORM: Record<string, string[]> = {}
PLATFORMS.forEach(platform => {
  platform.extensions.forEach(ext => {
    const lower = ext.toLowerCase()
    if (!EXTENSION_TO_PLATFORM[lower]) {
      EXTENSION_TO_PLATFORM[lower] = []
    }
    EXTENSION_TO_PLATFORM[lower].push(platform.id)
  })
})

// Get platform by ID
export function getPlatformById(id: string): Platform | undefined {
  return PLATFORMS.find(p => p.id === id)
}

// Detect platform from file path
export function detectPlatform(filePath: string): string | null {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase()
  const platforms = EXTENSION_TO_PLATFORM[ext]

  if (!platforms || platforms.length === 0) {
    return null
  }

  // If multiple platforms match, try to detect from folder structure
  if (platforms.length > 1) {
    const lowerPath = filePath.toLowerCase()
    for (const platformId of platforms) {
      const platform = getPlatformById(platformId)
      if (platform && lowerPath.includes(platform.id)) {
        return platformId
      }
      if (platform && lowerPath.includes(platform.shortName.toLowerCase())) {
        return platformId
      }
    }
  }

  return platforms[0]
}
