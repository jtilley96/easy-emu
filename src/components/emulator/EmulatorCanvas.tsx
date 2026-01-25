import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, MutableRefObject } from 'react'
import { Loader2 } from 'lucide-react'
import { useEmulatorStore } from '../../store/emulatorStore'
import { useInputStore } from '../../store/inputStore'

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
 * Automatically select the gamepad in EmulatorJS settings
 * Tries multiple approaches to programmatically set the gamepad
 */
function autoSelectGamepad(gamepadIndex: number): void {
  // Approach 1: Try to access EmulatorJS's internal settings API
  try {
    const emu = window.EJS_emulator
    if (emu && typeof (emu as any).setGamepad === 'function') {
      (emu as any).setGamepad(gamepadIndex)
      return
    }
  } catch (err) {
    // Emulator API approach failed, continue to next approach
  }

  // Approach 2: Try to set gamepad via EJS_STORAGE (before game starts)
  try {
    if (window.EJS_STORAGE && typeof window.EJS_STORAGE === 'object') {
      const storage = window.EJS_STORAGE as any
      if (storage.setItem) {
        storage.setItem('gamepad', String(gamepadIndex))
        storage.setItem('controller', String(gamepadIndex))
        storage.setItem('EJS_gamepad', String(gamepadIndex))
        storage.setItem('EJS_controller', String(gamepadIndex))
        // If this works, we can skip DOM manipulation
        return
      }
    }
  } catch (err) {
    // EJS_STORAGE approach failed, continue to next approach
  }

  // Approach 3: Try localStorage (EmulatorJS may use this)
  // Set this early so EmulatorJS picks it up when initializing
  try {
    localStorage.setItem('EJS_gamepad', String(gamepadIndex))
    localStorage.setItem('EJS_controller', String(gamepadIndex))
    localStorage.setItem('gamepad', String(gamepadIndex))
    localStorage.setItem('controller', String(gamepadIndex))
    // Try this first - if EmulatorJS reads from localStorage on init, this might work
    // and we can skip the DOM manipulation entirely
  } catch (err) {
    // localStorage approach failed, continue to DOM manipulation
  }

  // Approach 4: DOM manipulation - find and set the gamepad dropdown
  // This is a fallback if the API approaches don't work
  // Use retry mechanism to wait for EmulatorJS UI to be ready
  let attempts = 0
  const maxAttempts = 20 // Try for up to 10 seconds (20 * 500ms)
  
  const tryFindGamepadButton = (): void => {
    attempts++
    
    // First check if the player div exists
    const playerDiv = document.getElementById('ejs-player')
    if (!playerDiv) {
      if (attempts < maxAttempts) {
        setTimeout(tryFindGamepadButton, 500)
        return
      }
      return
    }
    
    // Try multiple selectors for the gamepad/controller button
    // EmulatorJS might render buttons in different ways
    const gamepadButtonSelectors = [
      // Direct data attributes
      '#ejs-player [data-button="gamepad"]',
      '#ejs-player [data-tool="gamepad"]',
      // Class-based selectors
      '#ejs-player .ejs-gamepad-button',
      '#ejs-player .ejs-toolbar-button[class*="gamepad" i]',
      '#ejs-player button[class*="gamepad" i]',
      // Title/aria-label based
      '#ejs-player button[title*="gamepad" i]',
      '#ejs-player button[title*="controller" i]',
      '#ejs-player button[aria-label*="gamepad" i]',
      '#ejs-player button[aria-label*="controller" i]',
      // Generic button in toolbar (might need to check all buttons)
      '#ejs-player .ejs-toolbar button',
      '#ejs-player button[class*="toolbar" i]',
      // Any button in the player area
      '#ejs-player button'
    ]
    
    let gamepadButton: HTMLElement | null = null
    for (const selector of gamepadButtonSelectors) {
      try {
        const buttons = document.querySelectorAll(selector)
        for (const btn of buttons) {
          const button = btn as HTMLElement
          const text = (button.textContent || '').toLowerCase()
          const title = (button.getAttribute('title') || '').toLowerCase()
          const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase()
          const className = (button.className || '').toLowerCase()
          
          // Check if this button is related to gamepad/controller
          if (text.includes('gamepad') || text.includes('controller') ||
              title.includes('gamepad') || title.includes('controller') ||
              ariaLabel.includes('gamepad') || ariaLabel.includes('controller') ||
              className.includes('gamepad') || className.includes('controller') ||
              selector.includes('gamepad') || selector.includes('controller')) {
            gamepadButton = button
            break
          }
        }
        if (gamepadButton) break
      } catch (e) {
        // Invalid selector, continue
        continue
      }
    }
    
    if (gamepadButton) {
      // Click to open gamepad settings
      gamepadButton.click()
      
      // Wait for settings panel to open (minimal delay)
      setTimeout(() => {
        // Try multiple selectors for the settings panel
        const settingsSelectors = [
          '#ejs-player .ejs-settings',
          '#ejs-player [class*="settings"]',
          '#ejs-player [class*="panel"]',
          '#ejs-player [class*="modal"]',
          '#ejs-player [class*="dialog"]',
          '#ejs-player [role="dialog"]',
          '#ejs-player [class*="popup"]',
          '#ejs-player [class*="overlay"]'
        ]
        
        let settingsPanel: Element | null = null
        for (const selector of settingsSelectors) {
          settingsPanel = document.querySelector(selector)
          if (settingsPanel && settingsPanel.querySelector('select')) break
        }
        
        if (settingsPanel) {
          // Try multiple selectors for the gamepad select dropdown
          const selectSelectors = [
            'select[name*="gamepad" i]',
            'select[name*="controller" i]',
            'select[id*="gamepad" i]',
            'select[id*="controller" i]',
            'select[class*="gamepad" i]',
            'select[class*="controller" i]',
            'select'
          ]
          
          let gamepadSelect: HTMLSelectElement | null = null
          for (const selector of selectSelectors) {
            const found = settingsPanel.querySelector(selector) as HTMLSelectElement
            if (found && found.options.length > 0) {
              gamepadSelect = found
              break
            }
          }
          
          if (gamepadSelect) {
            // Get available gamepads from navigator
            const gamepads = navigator.getGamepads()
            const availableIndices: number[] = []
            const targetGamepad = gamepads[gamepadIndex]
            const targetGamepadId = targetGamepad?.id || ''
            const targetGamepadIdLower = targetGamepadId.toLowerCase()
            
            for (let i = 0; i < gamepads.length; i++) {
              if (gamepads[i] && gamepads[i]!.connected) {
                availableIndices.push(i)
              }
            }
            
            // Try to find and select the matching gamepad
            // EmulatorJS formats options like "Xbox One Game Controller (STANDARD GAMEPAD)_0"
            // The format is: "{Gamepad ID}_{index}"
            let selected = false
            let matchedOptionIndex = -1
            
            // Try multiple matching strategies
            for (let i = 0; i < gamepadSelect.options.length; i++) {
              const option = gamepadSelect.options[i]
              const optionValue = option.value.trim()
              const optionText = option.text.trim().toLowerCase()
              
              // Strategy 1: Match by gamepad ID in value (e.g., "Xbox One Game Controller (STANDARD GAMEPAD)_0")
              // EmulatorJS uses format: "{gamepadId}_{index}"
              if (targetGamepadId && optionValue.includes(targetGamepadId)) {
                // Also check if the index matches (the part after the underscore)
                const indexMatch = optionValue.match(/_(\d+)$/)
                if (indexMatch && parseInt(indexMatch[1]) === gamepadIndex) {
                  matchedOptionIndex = i
                  selected = true
                  break
                }
              }
              
              // Strategy 2: Match by gamepad ID in text
              if (targetGamepadId && optionText.includes(targetGamepadIdLower)) {
                const indexMatch = optionValue.match(/_(\d+)$/) || optionText.match(/\b(\d+)\b/)
                if (indexMatch && parseInt(indexMatch[1]) === gamepadIndex) {
                  matchedOptionIndex = i
                  selected = true
                  break
                }
              }
              
              // Strategy 3: Direct index match in value (e.g., "0", "gamepad-0")
              if (optionValue === String(gamepadIndex) || optionValue.endsWith(`_${gamepadIndex}`)) {
                matchedOptionIndex = i
                selected = true
                break
              }
              
              // Strategy 4: Index in text (e.g., "Gamepad 0", "Controller 0")
              const indexInText = optionText.match(/\b(\d+)\b/)
              if (indexInText && parseInt(indexInText[1]) === gamepadIndex) {
                matchedOptionIndex = i
                selected = true
                break
              }
              
              // Strategy 5: Value contains index pattern (e.g., "gamepad-0", "controller0", "something_0")
              if (optionValue.includes(String(gamepadIndex)) && 
                  (optionValue.includes('gamepad') || optionValue.includes('controller') || optionValue.includes('_'))) {
                matchedOptionIndex = i
                selected = true
                break
              }
            }
            
            // If we found a match, set it
            if (selected && matchedOptionIndex >= 0) {
              // Set both value and selectedIndex to be sure
              gamepadSelect.selectedIndex = matchedOptionIndex
              gamepadSelect.value = gamepadSelect.options[matchedOptionIndex].value
              
              // Verify it was set
              if (gamepadSelect.selectedIndex === matchedOptionIndex) {
                // Now trigger the change event so EmulatorJS actually applies the selection
                // Trigger events immediately (DOM is already updated)
                try {
                  // Focus the select first (simulates user interaction)
                  gamepadSelect.focus()
                  
                  // Trigger input event first (some frameworks listen to this)
                  const inputEvent = new Event('input', { bubbles: true, cancelable: false })
                  gamepadSelect.dispatchEvent(inputEvent)
                  
                  // Use both old and new event creation methods for maximum compatibility
                  try {
                    const legacyChangeEvent = document.createEvent('HTMLEvents')
                    legacyChangeEvent.initEvent('change', true, false)
                    gamepadSelect.dispatchEvent(legacyChangeEvent)
                  } catch (e) {
                    // Legacy method not available, use modern one
                  }
                  
                  // Modern Event constructor
                  const changeEvent = new Event('change', { bubbles: true, cancelable: false })
                  gamepadSelect.dispatchEvent(changeEvent)
                  
                  // Also try UIEvent for better compatibility
                  const uiEvent = new UIEvent('change', { bubbles: true, cancelable: false, view: window })
                  gamepadSelect.dispatchEvent(uiEvent)
                  
                  // Blur immediately to simulate user finishing the selection
                  gamepadSelect.blur()
                } catch (err) {
                  console.error('[EmulatorCanvas] Error triggering change event:', err)
                }
              } else {
                console.warn(`[EmulatorCanvas] Failed to set selectedIndex - current: ${gamepadSelect.selectedIndex}, wanted: ${matchedOptionIndex}`)
              }
            } else {
              // Close panel if selection failed
              setTimeout(() => {
                const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
                document.dispatchEvent(escapeEvent)
              }, 200)
            }
          }
        }
      }, 150) // Wait for panel to open (reduced from 500ms)
    } else {
      // Retry if we haven't exceeded max attempts (faster retry for near-instant)
      if (attempts < maxAttempts) {
        setTimeout(tryFindGamepadButton, 200)
      }
    }
  }
  
  try {
    // Start trying after minimal delay (just enough for DOM to be ready)
    setTimeout(tryFindGamepadButton, 100)
  } catch (err) {
    console.error('[EmulatorCanvas] DOM manipulation approach failed:', err)
  }
}

const EmulatorCanvas = forwardRef<EmulatorCanvasRef, EmulatorCanvasProps>(
  ({ gameId, onStart, onStop, onError }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const mountedRef = useRef(true)
    const emulatorRef = useRef<typeof window.EJS_emulator | null>(null) as MutableRefObject<typeof window.EJS_emulator | null>
    const gamepadIndexRef = useRef<number | null>(null)

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

        // Detect connected gamepad for auto-selection
        // Use the user's physical controller (Xbox/PlayStation/Nintendo) - not platform-specific
        const inputStore = useInputStore.getState()
        const connectedGamepads = inputStore.gamepads.filter(g => g.connected)
        const gamepadToUse = inputStore.activeGamepadIndex !== null
          ? connectedGamepads.find(g => g.index === inputStore.activeGamepadIndex)
          : connectedGamepads[0]
        
        if (gamepadToUse) {
          gamepadIndexRef.current = gamepadToUse.index
          
          // Set gamepad preference BEFORE EmulatorJS initializes
          // This way EmulatorJS might pick it up automatically on load
          // Note: EmulatorJS will handle button mapping internally, but we ensure the correct
          // physical controller is selected so the user's controller layout is used
          try {
            localStorage.setItem('EJS_gamepad', String(gamepadToUse.index))
            localStorage.setItem('EJS_controller', String(gamepadToUse.index))
            localStorage.setItem('gamepad', String(gamepadToUse.index))
            localStorage.setItem('controller', String(gamepadToUse.index))
            
            // Store controller type info for reference (EmulatorJS may not use this directly)
            localStorage.setItem('EJS_controllerType', gamepadToUse.type)
            
            // Also try EJS_STORAGE if it exists
            if (window.EJS_STORAGE && typeof window.EJS_STORAGE === 'object') {
              const storage = window.EJS_STORAGE as any
              if (storage.setItem) {
                storage.setItem('gamepad', String(gamepadToUse.index))
                storage.setItem('controller', String(gamepadToUse.index))
                storage.setItem('EJS_gamepad', String(gamepadToUse.index))
                storage.setItem('EJS_controller', String(gamepadToUse.index))
                storage.setItem('EJS_controllerType', gamepadToUse.type)
              }
            }
          } catch (err) {
            // Failed to set gamepad preference in storage
          }
        } else {
          gamepadIndexRef.current = null
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
            
            // Auto-select gamepad after emulator is ready
            // Only use DOM manipulation if storage-based approach didn't work
            // Check if gamepad was already set via storage by checking if it's being used
            if (gamepadIndexRef.current !== null) {
              // Try DOM manipulation immediately (storage approach is tried first, this is fallback)
              // Minimal delay to ensure EmulatorJS UI has started rendering
              setTimeout(() => {
                autoSelectGamepad(gamepadIndexRef.current!)
              }, 500) // Reduced from 1000-5000ms to 500ms for near-instant selection
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

        // Filter console logs before loading EmulatorJS
        setupConsoleFilter()

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

      // Clean up EmulatorJS global state (but NOT EJS_STORAGE or scripts - those should persist)
      // Only clear configuration globals that need to be reset for next game
      const ejsGlobals = [
        'EJS_player', 'EJS_gameUrl', 'EJS_gameID', 'EJS_core',
        'EJS_pathtodata', 'EJS_startOnLoaded', 'EJS_volume', 'EJS_color',
        'EJS_onGameStart', 'EJS_emulator', 'EJS_gameData',
        'EJS_gameName', 'EJS_biosUrl', 'EJS_loadStateURL', 'EJS_cheats',
        'EJS_language', 'EJS_settings', 'EJS_CacheLimit', 'EJS_AdUrl',
        'EJS_Buttons'
      ]
      ejsGlobals.forEach(key => {
        try {
          delete (window as unknown as Record<string, unknown>)[key]
        } catch { /* ignore */ }
      })

      // NOTE: Do NOT remove EmulatorJS scripts or EJS_STORAGE
      // Removing and re-adding scripts causes "already declared" errors
      // EmulatorJS is designed to persist across navigations

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
      loadState: async (data: ArrayBuffer): Promise<void> => {
        const emu = window.EJS_emulator
        if (!emu?.gameManager) {
          console.warn('[EmulatorCanvas] No gameManager available for loadState')
          return
        }
        try {
          // EmulatorJS expects Uint8Array for setState
          const uint8Data = new Uint8Array(data)
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
