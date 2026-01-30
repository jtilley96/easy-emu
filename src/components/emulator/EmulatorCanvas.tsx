import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, MutableRefObject } from 'react'
import { Loader2 } from 'lucide-react'
import { useEmulatorStore } from '../../store/emulatorStore'

export interface EmulatorCanvasRef {
  saveState: () => Promise<ArrayBuffer | null>
  loadState: (data: ArrayBuffer) => Promise<boolean>
  saveSRAM: () => Promise<ArrayBuffer | null>
  screenshot: () => Promise<ArrayBuffer | null>
  pause: () => void
  resume: () => void
  setVolume: (volume: number) => void
  mute: () => void
  unmute: () => void
  toggleMute: () => void
  enterFullscreen: () => void
  exitFullscreen: () => void
  toggleFullscreen: () => void
  quickSave: () => void
  quickLoad: () => void
  setFastForward: (enabled: boolean) => void
  toggleFastForward: () => void
  isPaused: boolean
  isRunning: boolean
  isMuted: boolean
  isFastForward: boolean
}

interface EmulatorCanvasProps {
  gameId: string
  onStart?: () => void
  onStop?: () => void
  onError?: (error: Error) => void
}

const EMULATORJS_CDN = 'https://cdn.emulatorjs.org/stable'

// Module-level flag to prevent multiple script loads across React Strict Mode double-mounting
let isEmulatorLoading = false
let isEmulatorLoaded = false

// Patch WebGL context creation to enable preserveDrawingBuffer so that
// canvas screenshots capture the current frame instead of a cleared buffer.
let isGetContextPatched = false
function patchGetContext() {
  if (isGetContextPatched) return
  isGetContextPatched = true
  const origGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = function (type: string, attrs?: any) {
    if (type === 'webgl' || type === 'webgl2') {
      attrs = { ...attrs, preserveDrawingBuffer: true }
    }
    return origGetContext.call(this, type, attrs)
  } as typeof HTMLCanvasElement.prototype.getContext
}

// Filter out EmulatorJS translation logs
let originalConsoleLog: typeof console.log | null = null
function setupConsoleFilter() {
  if (originalConsoleLog) return // Already set up
  
  originalConsoleLog = console.log.bind(console)
  console.log = (...args: any[]) => {
    const message = args.join(' ')
    // Filter out EmulatorJS translation logs
    if (typeof message === 'string' && message.includes('Translation')) {
      return
    }
    if (originalConsoleLog) {
      originalConsoleLog(...args)
    }
  }
}

/**
 * Assign connected gamepads to player slots in EmulatorJS.
 *
 * EmulatorJS's GamepadHandler starts polling on creation. There is a race
 * condition: the handler can detect an already-connected gamepad and fire
 * its internal "connected" event BEFORE the emulator attaches the listener
 * that populates `gamepadSelection`.  When that happens the gamepad is
 * tracked inside the handler but never assigned to a player slot, so
 * in-game controls don't work.
 *
 * This function works around the race by directly writing to
 * `gamepadSelection` using the identifier format EmulatorJS expects:
 *   "{Gamepad.id}_{Gamepad.index}"
 *
 * It retries a few times because `gamepadSelection` may not exist yet
 * on the very first frame after EJS_onGameStart fires.
 */
function assignGamepadToPlayers(): void {
  let attempts = 0
  const maxAttempts = 40

  const tryAssign = () => {
    attempts++
    const emu = window.EJS_emulator as any
    if (!emu) {
      if (attempts < maxAttempts) {
        setTimeout(tryAssign, 250)
      }
      return
    }

    // Initialize gamepadSelection if it doesn't exist yet (some cores take
    // longer to set this up, causing gamepads to never get assigned)
    if (!Array.isArray(emu.gamepadSelection)) {
      emu.gamepadSelection = ['', '', '', '']
    }

    const rawGamepads = navigator.getGamepads()
    let assigned = false

    // Assign each connected physical gamepad to the first empty player slot
    for (const gp of rawGamepads) {
      if (!gp || !gp.connected) continue
      const identifier = `${gp.id}_${gp.index}`

      // Skip if this gamepad is already assigned to any slot
      if (emu.gamepadSelection.includes(identifier)) {
        assigned = true
        continue
      }

      // Find the first empty slot and assign
      for (let i = 0; i < emu.gamepadSelection.length; i++) {
        if (!emu.gamepadSelection[i] || emu.gamepadSelection[i] === '') {
          emu.gamepadSelection[i] = identifier
          assigned = true
          break
        }
      }
    }

    // Also update the UI labels if the method exists
    if (typeof emu.updateGamepadLabels === 'function') {
      try { emu.updateGamepadLabels() } catch { /* ignore */ }
    }

    // If no gamepad was assigned yet, keep retrying (gamepad may not be
    // detected by the browser yet even though it's physically connected)
    if (!assigned && attempts < maxAttempts) {
      setTimeout(tryAssign, 250)
    }
  }

  tryAssign()
}

const EmulatorCanvas = forwardRef<EmulatorCanvasRef, EmulatorCanvasProps>(
  ({ gameId, onStart, onStop, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const mountedRef = useRef(true)
    const emulatorRef = useRef<typeof window.EJS_emulator | null>(null) as MutableRefObject<typeof window.EJS_emulator | null>
    const { loadSRAM, saveSRAM: saveSRAMToBackend } = useEmulatorStore()

    // Initialize emulator
    const initializeEmulator = useCallback(async () => {
      // Prevent double initialization
      if (isEmulatorLoading || isEmulatorLoaded) {
        return
      }

      if (!containerRef.current) {
        return
      }

      isEmulatorLoading = true

      try {
        // Get game info
        const gameInfo = await window.electronAPI.embedded.getGameInfo(gameId)
        if (!gameInfo) {
          throw new Error('Game not found')
        }

        // Check if still mounted
        if (!mountedRef.current) {
          isEmulatorLoading = false
          return
        }

        // Get core paths
        const corePaths = await window.electronAPI.embedded.getCorePaths(gameInfo.platform)
        if (!corePaths) {
          throw new Error(`No core installed for platform: ${gameInfo.platform}`)
        }

        // Load ROM data directly (avoids CSP/URL issues)
        const romData = await window.electronAPI.embedded.getGameRomData(gameId)
        if (!romData || romData.length === 0) {
          throw new Error('Failed to load ROM file')
        }

        // Load existing SRAM
        const sramData = await loadSRAM(gameId)

        // Check if still mounted
        if (!mountedRef.current || !containerRef.current) {
          isEmulatorLoading = false
          return
        }

        // Configure EmulatorJS FIRST (before creating elements or loading script)
        // Set gameID for save data isolation
        window.EJS_gameID = String(gameId)

        // Create blob URL from ROM data
        const romBlob = new Blob([new Uint8Array(romData)])
        const blobUrl = URL.createObjectURL(romBlob)
        window.EJS_gameUrl = blobUrl
        window.EJS_core = corePaths.coreName
        window.EJS_pathtodata = `${EMULATORJS_CDN}/data/`
        window.EJS_startOnLoaded = true
        window.EJS_volume = 1.0
        window.EJS_color = '#6366f1'

        // NDS: display both screens side by side and rotate to landscape
        if (gameInfo.platform === 'nds') {
          window.EJS_defaultOptions = {
            melonds_screen_layout: 'Left/Right',
            melonds_screen_sizing: 'Even'
          }
          window.EJS_videoRotation = 1
        }

        // Enable gamepad support in toolbar
        window.EJS_Buttons = {
          playPause: true,
          restart: true,
          mute: true,
          settings: true,
          fullscreen: true,
          saveState: true,
          loadState: true,
          screenRecord: false,
          gamepad: true,
          cheat: false,
          volume: true,
          quickSave: true,
          quickLoad: true,
          screenshot: true,
          cacheManager: false
        }

        // Set up game start callback
        window.EJS_onGameStart = () => {
          if (mountedRef.current) {
            emulatorRef.current = window.EJS_emulator
            isEmulatorLoaded = true
            isEmulatorLoading = false
            onStart?.()

            // Assign connected gamepads to player slots after emulator is ready
            assignGamepadToPlayers()

            // NDS: scale the game display wider after EmulatorJS builds its DOM
            if (gameInfo.platform === 'nds') {
              const gameDiv = document.querySelector('#ejs-player > div') as HTMLElement
              if (gameDiv) {
                gameDiv.style.transform = 'scaleX(1.75)'
              }
            }
          }
        }

        // Load SRAM if available
        if (sramData) {
          const uint8Array = new Uint8Array(sramData)
          localStorage.setItem(`EJS_${gameId}_sram`, JSON.stringify(Array.from(uint8Array)))
        }

        // Create player div
        const playerDiv = document.createElement('div')
        playerDiv.id = 'ejs-player'
        playerDiv.style.width = '100%'
        playerDiv.style.height = '100%'
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(playerDiv)

        // Set player selector (must be set after element exists)
        window.EJS_player = '#ejs-player'

        // Ensure WebGL contexts use preserveDrawingBuffer for screenshots
        patchGetContext()

        // Filter console logs before loading EmulatorJS
        setupConsoleFilter()

        // Remove any existing loader script so we can re-initialize EmulatorJS
        // This is necessary because EmulatorJS only auto-initializes on script load
        const existingScript = document.getElementById('emulatorjs-loader')
        if (existingScript) {
          existingScript.remove()
        }

        // Load the EmulatorJS loader script
        const script = document.createElement('script')
        script.src = `${EMULATORJS_CDN}/data/loader.js`
        script.async = true
        script.id = 'emulatorjs-loader'
        script.onerror = () => {
          isEmulatorLoading = false
          onError?.(new Error('Failed to load EmulatorJS'))
        }
        document.body.appendChild(script)

      } catch (error) {
        console.error('Failed to initialize emulator:', error)
        isEmulatorLoading = false
        onError?.(error as Error)
      }
    }, [gameId, loadSRAM, onStart, onError])

    // Cleanup emulator
    const cleanupEmulator = useCallback(async () => {
      mountedRef.current = false

      // Reset flags immediately to allow re-initialization
      isEmulatorLoading = false
      isEmulatorLoaded = false

      try {
        // Try to stop the emulator using the EJS_emulator instance
        const emu = window.EJS_emulator
        if (emu) {
          // Try various methods to stop audio and emulation
          try {
            if (typeof emu.pause === 'function') emu.pause()
          } catch { /* ignore */ }
          try {
            if (typeof emu.mute === 'function') emu.mute()
          } catch { /* ignore */ }
          try {
            // EmulatorJS uses 'exit' to fully stop
            if (typeof emu.exit === 'function') emu.exit()
          } catch { /* ignore */ }
        }
      } catch (error) {
        console.error('Error stopping emulator:', error)
      }

      // Revoke blob URL if exists
      if (window.EJS_gameUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(window.EJS_gameUrl)
      }

      // Remove the EmulatorJS container element (stops audio context)
      const ejsPlayer = document.getElementById('ejs-player')
      if (ejsPlayer) {
        ejsPlayer.innerHTML = ''
        ejsPlayer.remove()
      }

      // Remove all iframes EmulatorJS might have created
      document.querySelectorAll('iframe[src*="emulator"]').forEach(el => el.remove())

      // Clean up EmulatorJS global state
      // Clear configuration globals that need to be reset for next game
      const ejsGlobals = [
        'EJS_player', 'EJS_gameUrl', 'EJS_gameID', 'EJS_core',
        'EJS_pathtodata', 'EJS_startOnLoaded', 'EJS_volume', 'EJS_color',
        'EJS_onGameStart', 'EJS_emulator', 'EJS_gameData',
        'EJS_gameName', 'EJS_biosUrl', 'EJS_loadStateURL', 'EJS_cheats',
        'EJS_language', 'EJS_settings', 'EJS_CacheLimit', 'EJS_AdUrl',
        'EJS_Buttons', 'EJS_ready', 'EJS_onReady', 'EJS_STORAGE', 'EJS_defaultOptions', 'EJS_defaultControls',
        'EJS_videoRotation'
      ]
      ejsGlobals.forEach(key => {
        try {
          delete (window as unknown as Record<string, unknown>)[key]
        } catch { /* ignore */ }
      })

      // Remove the EmulatorJS loader script and any scripts it injected (e.g. emulator.min.js)
      // so they can be re-loaded on next game without "already declared" errors
      const loaderScript = document.getElementById('emulatorjs-loader')
      if (loaderScript) {
        loaderScript.remove()
      }
      document.querySelectorAll('script[src*="emulatorjs"]').forEach(el => el.remove())

      emulatorRef.current = null

      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      onStop?.()
    }, [gameId, saveSRAMToBackend, onStop])

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      saveState: async (): Promise<ArrayBuffer | null> => {
        const emu = window.EJS_emulator
        if (!emu?.gameManager) {
          console.warn('[EmulatorCanvas] No gameManager available for saveState')
          return null
        }
        try {
          // EmulatorJS gameManager uses getState() which returns Uint8Array
          let state = null
          if (typeof emu.gameManager.getState === 'function') {
            state = emu.gameManager.getState()
          }
          // Convert Uint8Array to ArrayBuffer if needed
          if (state instanceof Uint8Array) {
            const arrayBuffer = state.buffer as ArrayBuffer
            return arrayBuffer.slice(state.byteOffset, state.byteOffset + state.byteLength)
          }
          return state
        } catch (err) {
          console.error('[EmulatorCanvas] saveState error:', err)
          return null
        }
      },
      loadState: async (data: ArrayBuffer): Promise<boolean> => {
        const emu = window.EJS_emulator
        if (!emu?.gameManager) {
          console.warn('[EmulatorCanvas] No gameManager available for loadState')
          return false
        }
        try {
          // EmulatorJS expects Uint8Array for setState
          const uint8Data = new Uint8Array(data)
          console.log('[EmulatorCanvas] Loading state, data size:', uint8Data.length)

          // Try multiple EmulatorJS APIs for loading state
          // Method 1: gameManager.loadState (newer EmulatorJS versions)
          if (typeof emu.gameManager.loadState === 'function') {
            console.log('[EmulatorCanvas] Using gameManager.loadState')
            emu.gameManager.loadState(uint8Data)
            return true
          }

          // Method 2: gameManager.setState (older EmulatorJS versions)
          if (typeof emu.gameManager.setState === 'function') {
            console.log('[EmulatorCanvas] Using gameManager.setState')
            emu.gameManager.setState(uint8Data)
            return true
          }

          // Method 3: Direct emulator loadState (expects ArrayBuffer)
          if (typeof emu.loadState === 'function') {
            console.log('[EmulatorCanvas] Using emu.loadState')
            await emu.loadState(data)
            return true
          }

          console.warn('[EmulatorCanvas] No compatible loadState method found')
          return false
        } catch (err) {
          console.error('[EmulatorCanvas] loadState error:', err)
          return false
        }
      },
      saveSRAM: async (): Promise<ArrayBuffer | null> => {
        const emu = window.EJS_emulator
        if (!emu?.gameManager) return null
        try {
          const data = emu.gameManager.getSRAM?.()
          if (data) {
            await saveSRAMToBackend(gameId, data)
            return data
          }
          return null
        } catch (err) {
          console.error('[EmulatorCanvas] saveSRAM error:', err)
          return null
        }
      },
      screenshot: async (): Promise<ArrayBuffer | null> => {
        const emu = window.EJS_emulator
        if (!emu) return null
        try {
          const canvas = (emu.canvas || document.querySelector('#ejs-player canvas')) as HTMLCanvasElement | null
          if (!canvas) return null

          // preserveDrawingBuffer is enabled via patchGetContext(), so
          // the framebuffer retains its contents and toBlob works directly.
          return new Promise((resolve) => {
            canvas.toBlob((blob) => {
              blob ? blob.arrayBuffer().then(resolve) : resolve(null)
            }, 'image/png')
          })
        } catch (err) {
          console.error('[EmulatorCanvas] screenshot error:', err)
          return null
        }
      },
      pause: () => {
        const emu = window.EJS_emulator
        if (emu?.pause) emu.pause()
        else if (emu?.gameManager?.pause) emu.gameManager.pause()
      },
      resume: () => {
        const emu = window.EJS_emulator
        if (emu?.play) emu.play()
        else if (emu?.resume) emu.resume()
        else if (emu?.gameManager?.play) emu.gameManager.play()
      },
      setVolume: (volume: number) => {
        const emu = window.EJS_emulator
        if (emu?.setVolume) emu.setVolume(volume)
      },
      mute: () => {
        const emu = window.EJS_emulator
        if (emu?.mute) emu.mute()
        else if (emu?.setVolume) emu.setVolume(0)
      },
      unmute: () => {
        const emu = window.EJS_emulator
        if (emu?.unmute) emu.unmute()
        else if (emu?.setVolume) emu.setVolume(1)
      },
      enterFullscreen: () => {
        const emu = window.EJS_emulator
        if (emu?.enterFullscreen) emu.enterFullscreen()
        else if (emu?.fullscreen) emu.fullscreen(true)
      },
      exitFullscreen: () => {
        const emu = window.EJS_emulator
        if (emu?.exitFullscreen) emu.exitFullscreen()
        else if (emu?.fullscreen) emu.fullscreen(false)
      },
      toggleMute: () => {
        const emu = window.EJS_emulator
        if (emu?.muted) {
          if (emu?.unmute) emu.unmute()
          else if (emu?.setVolume) emu.setVolume(1)
        } else {
          if (emu?.mute) emu.mute()
          else if (emu?.setVolume) emu.setVolume(0)
        }
      },
      toggleFullscreen: () => {
        const emu = window.EJS_emulator
        // Check document fullscreen state as EmulatorJS may not track it accurately
        if (document.fullscreenElement) {
          if (emu?.exitFullscreen) emu.exitFullscreen()
          else if (emu?.fullscreen) emu.fullscreen(false)
          else document.exitFullscreen()
        } else {
          if (emu?.enterFullscreen) emu.enterFullscreen()
          else if (emu?.fullscreen) emu.fullscreen(true)
        }
      },
      quickSave: () => {
        const emu = window.EJS_emulator
        // Try multiple approaches for quick save
        if (emu?.quickSave) {
          emu.quickSave()
        } else if (emu?.gameManager?.getState) {
          // Fallback: save state to localStorage as quick save
          try {
            const state = emu.gameManager.getState()
            if (state) {
              const stateArray = Array.from(state)
              localStorage.setItem(`EJS_${gameId}_quicksave`, JSON.stringify(stateArray))
              console.log('[EmulatorCanvas] Quick saved to localStorage')
            }
          } catch (err) {
            console.error('[EmulatorCanvas] Quick save failed:', err)
          }
        }
      },
      quickLoad: () => {
        const emu = window.EJS_emulator
        // Try multiple approaches for quick load
        if (emu?.quickLoad) {
          emu.quickLoad()
        } else if (emu?.gameManager?.loadState || emu?.gameManager?.setState) {
          // Fallback: load state from localStorage
          try {
            const savedState = localStorage.getItem(`EJS_${gameId}_quicksave`)
            if (savedState) {
              const stateArray = JSON.parse(savedState)
              const uint8Data = new Uint8Array(stateArray)
              if (emu.gameManager.loadState) {
                emu.gameManager.loadState(uint8Data)
              } else if (emu.gameManager.setState) {
                emu.gameManager.setState(uint8Data)
              }
              console.log('[EmulatorCanvas] Quick loaded from localStorage')
            } else {
              console.warn('[EmulatorCanvas] No quick save found')
            }
          } catch (err) {
            console.error('[EmulatorCanvas] Quick load failed:', err)
          }
        }
      },
      setFastForward: (enabled: boolean) => {
        const emu = window.EJS_emulator as any
        // Try multiple approaches for fast forward
        if (emu?.setFastForward) {
          emu.setFastForward(enabled)
        } else if (emu?.Module?.setFastForward) {
          emu.Module.setFastForward(enabled)
        } else if (emu?.gameManager) {
          // Try setting speed multiplier
          const gm = emu.gameManager as any
          if (gm.setSpeed) {
            gm.setSpeed(enabled ? 3 : 1) // 3x speed when fast forward
          } else if (gm.setFrameSkip) {
            gm.setFrameSkip(enabled ? 2 : 0)
          }
        }
        // Store state for getter
        (window as any)._ejsFastForward = enabled
      },
      toggleFastForward: () => {
        const currentState = (window as any)._ejsFastForward ?? false
        const newState = !currentState
        const emu = window.EJS_emulator as any
        if (emu?.setFastForward) {
          emu.setFastForward(newState)
        } else if (emu?.Module?.setFastForward) {
          emu.Module.setFastForward(newState)
        } else if (emu?.gameManager) {
          const gm = emu.gameManager as any
          if (gm.setSpeed) {
            gm.setSpeed(newState ? 3 : 1)
          } else if (gm.setFrameSkip) {
            gm.setFrameSkip(newState ? 2 : 0)
          }
        }
        (window as any)._ejsFastForward = newState
      },
      get isPaused() {
        const emu = window.EJS_emulator
        return emu?.paused ?? emu?.isPaused ?? false
      },
      get isRunning() {
        const emu = window.EJS_emulator
        return emu?.started ?? emu?.isRunning ?? false
      },
      get isMuted() {
        const emu = window.EJS_emulator
        return emu?.muted ?? false
      },
      get isFastForward() {
        return (window as any)._ejsFastForward ?? false
      }
    }), [gameId, saveSRAMToBackend])

    // Initialize on mount
    useEffect(() => {
      mountedRef.current = true

      // Small delay to let React Strict Mode's first unmount happen
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          initializeEmulator()
        }
      }, 100)

      return () => {
        clearTimeout(timer)
        cleanupEmulator()
      }
    }, []) // Empty deps - only run on mount/unmount

    return (
      <div className="relative w-full h-full bg-black">
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center"
        >
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
            <p className="text-surface-400">Loading emulator...</p>
          </div>
        </div>
      </div>
    )
  }
)

EmulatorCanvas.displayName = 'EmulatorCanvas'

export default EmulatorCanvas
