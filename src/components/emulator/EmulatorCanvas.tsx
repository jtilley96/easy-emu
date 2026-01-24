import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, MutableRefObject } from 'react'
import { Loader2 } from 'lucide-react'
import { useEmulatorStore } from '../../store/emulatorStore'

export interface EmulatorCanvasRef {
  saveState: () => Promise<ArrayBuffer | null>
  loadState: (data: ArrayBuffer) => Promise<void>
  saveSRAM: () => Promise<ArrayBuffer | null>
  screenshot: () => Promise<ArrayBuffer | null>
  pause: () => void
  resume: () => void
  setVolume: (volume: number) => void
  mute: () => void
  unmute: () => void
  enterFullscreen: () => void
  exitFullscreen: () => void
  isPaused: boolean
  isRunning: boolean
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

const EmulatorCanvas = forwardRef<EmulatorCanvasRef, EmulatorCanvasProps>(
  ({ gameId, onStart, onStop, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const mountedRef = useRef(true)
    const emulatorRef = useRef<typeof window.EJS_emulator | null>(null) as MutableRefObject<typeof window.EJS_emulator | null>

    const { loadSRAM, saveSRAM: saveSRAMToBackend } = useEmulatorStore()

    // Initialize emulator
    const initializeEmulator = useCallback(async () => {
      console.log('[EmulatorCanvas] initializeEmulator called, flags:', { isEmulatorLoading, isEmulatorLoaded })

      // Prevent double initialization
      if (isEmulatorLoading || isEmulatorLoaded) {
        console.log('[EmulatorCanvas] Skipping - already loading or loaded')
        return
      }

      if (!containerRef.current) {
        console.log('[EmulatorCanvas] Skipping - no container ref')
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
        console.log(`[EmulatorCanvas] Loaded ROM: ${romData.length} bytes`)

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
        const romBlob = new Blob([romData])
        const blobUrl = URL.createObjectURL(romBlob)
        window.EJS_gameUrl = blobUrl
        window.EJS_core = corePaths.coreName
        window.EJS_pathtodata = `${EMULATORJS_CDN}/data/`
        window.EJS_startOnLoaded = true
        window.EJS_volume = 1.0
        window.EJS_color = '#6366f1'

        console.log(`[EmulatorCanvas] Config set - Game ID: ${gameId}, Core: ${corePaths.coreName}`)

        // Set up game start callback
        window.EJS_onGameStart = () => {
          if (mountedRef.current) {
            emulatorRef.current = window.EJS_emulator
            isEmulatorLoaded = true
            isEmulatorLoading = false
            onStart?.()
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

        // Load the EmulatorJS loader script (only once)
        const existingScript = document.getElementById('emulatorjs-loader')
        if (!existingScript) {
          const script = document.createElement('script')
          script.src = `${EMULATORJS_CDN}/data/loader.js`
          script.async = true
          script.id = 'emulatorjs-loader'
          script.onerror = () => {
            isEmulatorLoading = false
            onError?.(new Error('Failed to load EmulatorJS'))
          }
          document.body.appendChild(script)
        }

      } catch (error) {
        console.error('Failed to initialize emulator:', error)
        isEmulatorLoading = false
        onError?.(error as Error)
      }
    }, [gameId, loadSRAM, onStart, onError])

    // Cleanup emulator
    const cleanupEmulator = useCallback(async () => {
      console.log('[EmulatorCanvas] Cleaning up emulator...')
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

      // Clean up ALL EmulatorJS global state
      const ejsGlobals = [
        'EJS_player', 'EJS_gameUrl', 'EJS_gameID', 'EJS_core',
        'EJS_pathtodata', 'EJS_startOnLoaded', 'EJS_volume', 'EJS_color',
        'EJS_onGameStart', 'EJS_emulator', 'EJS_STORAGE', 'EJS_gameData',
        'EJS_gameName', 'EJS_biosUrl', 'EJS_loadStateURL', 'EJS_cheats',
        'EJS_language', 'EJS_settings', 'EJS_CacheLimit', 'EJS_AdUrl'
      ]
      ejsGlobals.forEach(key => {
        try {
          delete (window as Record<string, unknown>)[key]
        } catch { /* ignore */ }
      })
      console.log('[EmulatorCanvas] Cleaned up EJS globals')

      // Remove ALL EmulatorJS scripts
      document.querySelectorAll('script[src*="emulatorjs"]').forEach(s => s.remove())
      document.querySelectorAll('script[id="emulatorjs-loader"]').forEach(s => s.remove())

      // Remove EmulatorJS stylesheets
      document.querySelectorAll('link[href*="emulatorjs"]').forEach(s => s.remove())
      document.querySelectorAll('style[data-emulatorjs]').forEach(s => s.remove())

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
          console.log('[EmulatorCanvas] Save state result:', state, 'type:', state?.constructor?.name)
          // Convert Uint8Array to ArrayBuffer if needed
          if (state instanceof Uint8Array) {
            return state.buffer.slice(state.byteOffset, state.byteOffset + state.byteLength)
          }
          return state
        } catch (err) {
          console.error('[EmulatorCanvas] saveState error:', err)
          return null
        }
      },
      loadState: async (data: ArrayBuffer): Promise<void> => {
        const emu = window.EJS_emulator
        if (!emu?.gameManager) {
          console.warn('[EmulatorCanvas] No gameManager available for loadState')
          return
        }
        try {
          // EmulatorJS expects Uint8Array for setState
          const uint8Data = new Uint8Array(data)
          console.log('[EmulatorCanvas] Loading state, size:', uint8Data.length)
          if (typeof emu.gameManager.setState === 'function') {
            emu.gameManager.setState(uint8Data)
          }
        } catch (err) {
          console.error('[EmulatorCanvas] loadState error:', err)
        }
      },
      saveSRAM: async (): Promise<ArrayBuffer | null> => {
        const emu = window.EJS_emulator
        if (!emu?.gameManager) return null
        try {
          const data = emu.gameManager.getSRAM?.()
          if (data) {
            await saveSRAMToBackend(gameId, data)
          }
          return data
        } catch (err) {
          console.error('[EmulatorCanvas] saveSRAM error:', err)
          return null
        }
      },
      screenshot: async (): Promise<ArrayBuffer | null> => {
        const emu = window.EJS_emulator
        if (!emu) return null
        try {
          // EmulatorJS has a screenshot method that returns canvas data
          const canvas = emu.canvas || document.querySelector('#ejs-player canvas')
          if (canvas) {
            return new Promise((resolve) => {
              (canvas as HTMLCanvasElement).toBlob((blob) => {
                if (blob) {
                  blob.arrayBuffer().then(resolve)
                } else {
                  resolve(null)
                }
              }, 'image/png')
            })
          }
          return null
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
      get isPaused() {
        const emu = window.EJS_emulator
        return emu?.paused ?? emu?.isPaused ?? false
      },
      get isRunning() {
        const emu = window.EJS_emulator
        return emu?.started ?? emu?.isRunning ?? false
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
