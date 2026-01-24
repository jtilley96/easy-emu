import { PLATFORM_CORE_MAP } from './types'

export interface LoaderConfig {
  gameId: string
  platform: string
  romPath: string
  coresPath: string
  containerId: string
  onStart?: () => void
  onStop?: () => void
  onSaveData?: (data: ArrayBuffer) => void
  onError?: (error: Error) => void
  sramData?: ArrayBuffer | null
  shader?: string
  integerScaling?: boolean
  volume?: number
}

// EmulatorJS CDN for the loader script
const EMULATORJS_CDN = 'https://cdn.emulatorjs.org/stable'

let loadedScript = false
let scriptPromise: Promise<void> | null = null

function loadEmulatorJSScript(): Promise<void> {
  if (loadedScript) {
    return Promise.resolve()
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise((resolve, reject) => {
    // Load the EmulatorJS loader script
    const script = document.createElement('script')
    script.src = `${EMULATORJS_CDN}/loader.js`
    script.async = true
    script.onload = () => {
      loadedScript = true
      resolve()
    }
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Failed to load EmulatorJS script'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

export class EmulatorLoader {
  private config: LoaderConfig
  private container: HTMLElement | null = null
  private internalRunning = false
  private sramSaveInterval: NodeJS.Timeout | null = null

  constructor(config: LoaderConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    this.container = document.getElementById(this.config.containerId)
    if (!this.container) {
      throw new Error(`Container element not found: ${this.config.containerId}`)
    }

    // Load EmulatorJS script
    await loadEmulatorJSScript()

    // Get core info
    const coreName = PLATFORM_CORE_MAP[this.config.platform]
    if (!coreName) {
      throw new Error(`Unsupported platform: ${this.config.platform}`)
    }

    // Create player div
    const playerDiv = document.createElement('div')
    playerDiv.id = 'ejs-player'
    playerDiv.style.width = '100%'
    playerDiv.style.height = '100%'
    this.container.innerHTML = ''
    this.container.appendChild(playerDiv)

    // Configure EmulatorJS global settings
    window.EJS_player = playerDiv
    window.EJS_gameUrl = `file://${this.config.romPath}`
    window.EJS_core = coreName
    window.EJS_pathtodata = `${EMULATORJS_CDN}/data/`
    window.EJS_startOnLoaded = true
    window.EJS_volume = this.config.volume ?? 1.0
    window.EJS_color = '#6366f1' // Match app accent color

    // Set up callbacks
    window.EJS_onGameStart = () => {
      this.internalRunning = true
      this.startSramAutoSave()
      this.config.onStart?.()
    }

    // Load SRAM data if available
    if (this.config.sramData) {
      this.loadInitialSRAM(this.config.sramData)
    }

    // Re-load the script to initialize with new config
    const loaderScript = document.createElement('script')
    loaderScript.src = `${EMULATORJS_CDN}/loader.js`
    loaderScript.async = true
    document.body.appendChild(loaderScript)
  }

  private loadInitialSRAM(data: ArrayBuffer): void {
    // EmulatorJS will load this when the game starts
    // Store it for the emulator to pick up
    const uint8Array = new Uint8Array(data)
    localStorage.setItem(`ejs_sram_${this.config.gameId}`, JSON.stringify(Array.from(uint8Array)))
  }

  private startSramAutoSave(): void {
    // Auto-save SRAM every 30 seconds
    this.sramSaveInterval = setInterval(() => {
      this.saveSRAM()
    }, 30000)
  }

  private stopSramAutoSave(): void {
    if (this.sramSaveInterval) {
      clearInterval(this.sramSaveInterval)
      this.sramSaveInterval = null
    }
  }

  async saveSRAM(): Promise<ArrayBuffer | null> {
    if (!window.EJS_emulator?.isRunning) return null

    try {
      const sramData = window.EJS_emulator.getSRAM()
      if (sramData && this.config.onSaveData) {
        this.config.onSaveData(sramData)
      }
      return sramData
    } catch (error) {
      console.error('Failed to save SRAM:', error)
      return null
    }
  }

  async saveState(): Promise<ArrayBuffer | null> {
    if (!window.EJS_emulator?.isRunning) return null

    try {
      return await window.EJS_emulator.saveState()
    } catch (error) {
      console.error('Failed to save state:', error)
      return null
    }
  }

  async loadState(data: ArrayBuffer): Promise<void> {
    if (!window.EJS_emulator?.isRunning) return

    try {
      await window.EJS_emulator.loadState(data)
    } catch (error) {
      console.error('Failed to load state:', error)
      throw error
    }
  }

  async screenshot(): Promise<ArrayBuffer | null> {
    if (!window.EJS_emulator?.isRunning) return null

    try {
      return await window.EJS_emulator.screenshot()
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      return null
    }
  }

  pause(): void {
    window.EJS_emulator?.pause()
  }

  resume(): void {
    const emu = window.EJS_emulator
    if (emu?.resume) emu.resume()
    else if (emu?.play) emu.play()
  }

  setVolume(volume: number): void {
    window.EJS_emulator?.setVolume(Math.max(0, Math.min(1, volume)))
  }

  mute(): void {
    window.EJS_emulator?.mute()
  }

  unmute(): void {
    window.EJS_emulator?.unmute()
  }

  enterFullscreen(): void {
    const emu = window.EJS_emulator
    if (emu?.enterFullscreen) emu.enterFullscreen()
    else if (emu?.fullscreen) emu.fullscreen(true)
  }

  exitFullscreen(): void {
    const emu = window.EJS_emulator
    if (emu?.exitFullscreen) emu.exitFullscreen()
    else if (emu?.fullscreen) emu.fullscreen(false)
  }

  get isPaused(): boolean {
    return window.EJS_emulator?.isPaused ?? false
  }

  get running(): boolean {
    return this.internalRunning || (window.EJS_emulator?.isRunning ?? false)
  }

  async stop(): Promise<void> {
    this.stopSramAutoSave()

    // Save SRAM before stopping
    await this.saveSRAM()

    if (window.EJS_emulator) {
      window.EJS_emulator.stop()
    }

    this.internalRunning = false
    this.config.onStop?.()

    // Clean up global state
    delete window.EJS_player
    delete window.EJS_gameUrl
    delete window.EJS_core
    delete window.EJS_pathtodata
    delete window.EJS_startOnLoaded
    delete window.EJS_volume
    delete window.EJS_color
    delete window.EJS_onGameStart
    delete window.EJS_emulator

    // Clear container
    if (this.container) {
      this.container.innerHTML = ''
    }
  }
}

export function createEmulatorLoader(config: LoaderConfig): EmulatorLoader {
  return new EmulatorLoader(config)
}
