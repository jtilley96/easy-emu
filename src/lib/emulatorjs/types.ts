// EmulatorJS type definitions

export interface EmulatorJSConfig {
  // Required
  gameUrl: string
  core: string

  // Paths
  dataPath?: string
  corePath?: string
  biosPath?: string

  // UI options
  startOnLoad?: boolean
  fullscreen?: boolean
  volume?: number
  muted?: boolean

  // Video options
  shader?: 'none' | 'crt' | 'scanlines' | 'lcd'
  integerScaling?: boolean

  // Save data
  gameSaveData?: ArrayBuffer
  onSaveState?: (data: ArrayBuffer) => void
  onLoadState?: (slot: number) => Promise<ArrayBuffer | null>

  // Callbacks
  onGameStart?: () => void
  onGameEnd?: () => void
  onSRAMSave?: (data: ArrayBuffer) => void
  onError?: (error: Error) => void
}

export interface EmulatorJSGameManager {
  getState?: () => Uint8Array
  setState?: (data: Uint8Array) => void
  loadState?: (data: Uint8Array) => void
  getSRAM?: () => ArrayBuffer
  pause?: () => void
  play?: () => void
}

export interface EmulatorJSInstance {
  // Control methods
  start: () => void
  pause: () => void
  resume?: () => void
  restart: () => void
  stop: () => void
  exit?: () => void
  play?: () => void

  // State methods
  saveState: () => Promise<ArrayBuffer>
  loadState: (data: ArrayBuffer) => Promise<void>
  getSRAM: () => ArrayBuffer | null

  // Audio/Video
  setVolume: (volume: number) => void
  mute: () => void
  unmute: () => void
  enterFullscreen?: () => void
  exitFullscreen?: () => void
  fullscreen?: (enable: boolean) => void
  screenshot: () => Promise<ArrayBuffer>

  // Properties
  isPaused?: boolean
  isRunning?: boolean
  paused?: boolean
  started?: boolean
  canvas?: HTMLCanvasElement

  // Internal game manager
  gameManager?: EmulatorJSGameManager
}

// EmulatorJS button visibility config
export interface EmulatorJSButtons {
  playPause?: boolean
  restart?: boolean
  mute?: boolean
  settings?: boolean
  fullscreen?: boolean
  saveState?: boolean
  loadState?: boolean
  screenRecord?: boolean
  gamepad?: boolean
  cheat?: boolean
  volume?: boolean
  quickSave?: boolean
  quickLoad?: boolean
  screenshot?: boolean
  cacheManager?: boolean
}

// EmulatorJS global type (when loaded via script tag)
declare global {
  interface Window {
    EJS_player?: string | HTMLDivElement
    EJS_gameUrl?: string
    EJS_gameData?: Blob
    EJS_gameName?: string
    EJS_gameID?: string
    EJS_core?: string
    EJS_pathtodata?: string
    EJS_startOnLoaded?: boolean
    EJS_volume?: number
    EJS_color?: string
    EJS_defaultControls?: Record<number, Record<number, { value: string; value2: string }>>
    EJS_Buttons?: EmulatorJSButtons
    EJS_onGameStart?: () => void
    EJS_onSaveState?: (data: ArrayBuffer) => void
    EJS_onLoadState?: (slot: number) => Promise<ArrayBuffer | null>
    EJS_emulator?: EmulatorJSInstance
    EJS_STORAGE?: unknown
  }
}

// Platform to EmulatorJS core mapping
export const PLATFORM_CORE_MAP: Record<string, string> = {
  nes: 'fceumm',
  snes: 'snes9x',
  n64: 'mupen64plus_next',
  gb: 'gambatte',
  gbc: 'gambatte',
  gba: 'mgba',
  genesis: 'genesis_plus_gx',
  megadrive: 'genesis_plus_gx',
  sms: 'genesis_plus_gx',
  gamegear: 'genesis_plus_gx',
  ps1: 'mednafen_psx',
  psx: 'mednafen_psx'
}

// Platform to EmulatorJS system mapping
export const PLATFORM_SYSTEM_MAP: Record<string, string> = {
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
