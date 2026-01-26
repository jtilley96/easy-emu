import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import EmulatorCanvas, { EmulatorCanvasRef } from '../components/emulator/EmulatorCanvas'
import EmulatorHUD from '../components/emulator/EmulatorHUD'
import SaveStateModal from '../components/emulator/SaveStateModal'
import EmulatorMenuModal from '../components/emulator/EmulatorMenuModal'
import { useEmulatorStore } from '../store/emulatorStore'
import { useLibraryStore } from '../store/libraryStore'
import { useUIStore } from '../store/uiStore'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import { getGamepadService } from '../services/gamepadService'
import type { EmulatorHotkeyAction } from '../types'

/**
 * Simulate a keyboard button press for EmulatorJS
 * EmulatorJS default keyboard controls:
 * - D-pad: Arrow keys
 * - A button: x
 * - B button: z
 * - Start: Enter
 * - Select: Shift
 *
 * We try multiple approaches since synthetic events may not work with all emulator input systems
 */
function dispatchKeyToEmulator(key: string, type: 'keydown' | 'keyup' = 'keydown'): void {
  // Map keys to their correct codes and keyCodes
  const keyMap: Record<string, { code: string; keyCode: number }> = {
    'x': { code: 'KeyX', keyCode: 88 },
    'z': { code: 'KeyZ', keyCode: 90 },
    'Enter': { code: 'Enter', keyCode: 13 },
    'Shift': { code: 'ShiftLeft', keyCode: 16 },
  }

  const mapping = keyMap[key] || { code: `Key${key.toUpperCase()}`, keyCode: key.charCodeAt(0) }

  // Ensure the EmulatorJS player has focus first
  const ejsPlayer = document.getElementById('ejs-player')
  const canvas = ejsPlayer?.querySelector('canvas') as HTMLCanvasElement
  if (canvas) {
    canvas.focus()
  }

  // Create event with all properties EmulatorJS might check
  const eventInit: KeyboardEventInit = {
    key,
    code: mapping.code,
    keyCode: mapping.keyCode,
    which: mapping.keyCode,
    charCode: key.length === 1 ? key.charCodeAt(0) : 0,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    repeat: false,
    isTrusted: false, // Can't fake this, but we try anyway
  }

  // Create a custom event that's harder to distinguish from real events
  const event = new KeyboardEvent(type, eventInit)

  // Try to set the deprecated but sometimes-checked properties
  try {
    Object.defineProperty(event, 'keyCode', { value: mapping.keyCode, writable: false })
    Object.defineProperty(event, 'which', { value: mapping.keyCode, writable: false })
    Object.defineProperty(event, 'charCode', { value: key.length === 1 ? key.charCodeAt(0) : 0, writable: false })
  } catch (e) {
    // Properties might already be defined
  }

  // Dispatch to multiple targets
  // 1. Document body (common listener location)
  document.body.dispatchEvent(new KeyboardEvent(type, eventInit))

  // 2. Window (global listener)
  window.dispatchEvent(new KeyboardEvent(type, eventInit))

  // 3. Document
  document.dispatchEvent(new KeyboardEvent(type, eventInit))

  // 4. Canvas element (if EmulatorJS is listening there)
  if (canvas) {
    canvas.dispatchEvent(new KeyboardEvent(type, eventInit))
  }

  // 5. The player div
  if (ejsPlayer) {
    ejsPlayer.dispatchEvent(new KeyboardEvent(type, eventInit))
  }

  // 6. Try the EmulatorJS internal API if available
  try {
    const emu = (window as any).EJS_emulator
    if (emu) {
      // Check for various input methods EmulatorJS might expose
      if (typeof emu.simulateKeyPress === 'function') {
        emu.simulateKeyPress(mapping.keyCode, type === 'keydown')
      }
      if (typeof emu.gameManager?.simulateInput === 'function') {
        emu.gameManager.simulateInput(key, type === 'keydown')
      }
      // Some versions use Module.ccall for input
      if (emu.Module?.ccall && type === 'keydown') {
        try {
          emu.Module.ccall('simulate_input_char', 'void', ['number'], [mapping.keyCode])
        } catch (e) {
          // Function might not exist
        }
      }
    }
  } catch (e) {
    // EmulatorJS API not available
  }

  console.log(`[EmulatorView] Dispatched ${type} '${key}' (keyCode: ${mapping.keyCode})`)
}

export default function EmulatorView() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()

  const { games } = useLibraryStore()
  const { startGame, stopGame, saveState, loadState } = useEmulatorStore()
  const { addToast } = useUIStore()

  const emulatorRef = useRef<EmulatorCanvasRef>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [showHUD, setShowHUD] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveModalMode, setSaveModalMode] = useState<'save' | 'load'>('save')
  const [menuModalOpen, setMenuModalOpen] = useState(false)
  const [sessionStartTime] = useState(Date.now())
  const [_isFastForward, setIsFastForward] = useState(false)
  const [emulatorHotkeys, setEmulatorHotkeys] = useState<Record<string, EmulatorHotkeyAction>>({})

  const hideHUDTimeout = useRef<NodeJS.Timeout | null>(null)

  const game = games.find(g => g.id === gameId)

  // Load hotkey configuration
  useEffect(() => {
    const loadHotkeys = async () => {
      try {
        const hotkeys = await window.electronAPI.config.get('emulatorHotkeys')
        if (hotkeys) {
          setEmulatorHotkeys(hotkeys as Record<string, EmulatorHotkeyAction>)
        }
      } catch (err) {
        console.error('Failed to load emulator hotkeys:', err)
      }
    }
    loadHotkeys()
  }, [])

  // Start game session on mount
  useEffect(() => {
    if (!gameId) {
      navigate('/')
      return
    }

    const initGame = async () => {
      try {
        const result = await startGame(gameId)
        if (!result.success) {
          setError(result.error || 'Failed to start game')
        }
      } catch (err) {
        setError((err as Error).message)
      }
    }

    initGame()

    return () => {
      // End session on unmount
      if (gameId) {
        const playTime = Date.now() - sessionStartTime
        stopGame(playTime)
      }
    }
  }, [gameId])


  // Handle select button to open menu
  // Note: Start button is NOT intercepted - it passes through to the emulated game
  // Use keyboard P or the HUD button to pause the emulator
  const handleSelectButton = useCallback(() => {
    if (!menuModalOpen && !saveModalOpen && !isLoading) {
      setMenuModalOpen(true)
      emulatorRef.current?.pause()
      setIsPaused(true)
    }
  }, [menuModalOpen, saveModalOpen, isLoading])

  // Gamepad navigation - Select opens menu
  // Disable keyboard fallback since EmulatorView has its own keyboard handling
  useGamepadNavigation({
    enabled: !menuModalOpen && !saveModalOpen && !isLoading,
    enableKeyboardFallback: false,
    onSelect: handleSelectButton
  })

  // Auto-hide HUD after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowHUD(true)
      if (hideHUDTimeout.current) {
        clearTimeout(hideHUDTimeout.current)
      }
      hideHUDTimeout.current = setTimeout(() => {
        if (!isPaused && !saveModalOpen && !menuModalOpen) {
          setShowHUD(false)
        }
      }, 3000)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (hideHUDTimeout.current) {
        clearTimeout(hideHUDTimeout.current)
      }
    }
  }, [isPaused, saveModalOpen, menuModalOpen])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleEmulatorStart = () => {
    setIsLoading(false)
  }

  const handleEmulatorStop = () => {
    // Session already ended in useEffect cleanup
  }

  const handleEmulatorError = (err: Error) => {
    setError(err.message)
    setIsLoading(false)
  }

  const handleExit = async () => {
    // Save SRAM before exiting
    try {
      await emulatorRef.current?.saveSRAM()
    } catch {
      // Ignore save errors on exit
    }

    // Calculate play time and navigate back
    const playTime = Date.now() - sessionStartTime
    await stopGame(playTime)

    // Replace history so "Back" from game details doesn't return to /play/ (avoids stuck loading)
    navigate(`/game/${gameId}`, { replace: true })
  }

  const togglePause = () => {
    if (isPaused) {
      emulatorRef.current?.resume()
      setIsPaused(false)
    } else {
      emulatorRef.current?.pause()
      setIsPaused(true)
    }
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    if (isFullscreen) {
      await document.exitFullscreen()
    } else {
      await containerRef.current.requestFullscreen()
    }
  }

  const openSaveModal = () => {
    setMenuModalOpen(false) // Close menu if open (without resuming)
    setSaveModalMode('save')
    setSaveModalOpen(true)
    emulatorRef.current?.pause()
    setIsPaused(true)
  }

  const openLoadModal = () => {
    setMenuModalOpen(false) // Close menu if open (without resuming)
    setSaveModalMode('load')
    setSaveModalOpen(true)
    emulatorRef.current?.pause()
    setIsPaused(true)
  }

  const closeSaveModal = () => {
    setSaveModalOpen(false)
    // Resume game when save/load modal closes
    // Add a small delay to prevent the closing button press from being sent to the game
    setTimeout(() => {
      emulatorRef.current?.resume()
      setIsPaused(false)
    }, 100)
  }

  const closeMenuModal = (shouldResume = true) => {
    setMenuModalOpen(false)
    // Resume emulator when menu closes (unless paused for another reason or explicitly told not to)
    // Add a small delay to prevent the closing button press from being sent to the game
    if (shouldResume && !saveModalOpen) {
      setTimeout(() => {
        emulatorRef.current?.resume()
        setIsPaused(false)
      }, 100)
    }
  }

  const handleSaveState = async (slot: number) => {
    if (!gameId) return

    try {
      const stateData = await emulatorRef.current?.saveState()
      if (!stateData) {
        throw new Error('Failed to capture state')
      }

      // Capture screenshot
      const screenshot = await emulatorRef.current?.screenshot()

      await saveState(gameId, slot, stateData, screenshot ?? undefined)
      addToast('success', `Saved to slot ${slot + 1}`)
    } catch (err) {
      addToast('error', `Failed to save state: ${(err as Error).message}`)
      throw err
    }
  }

  const handleLoadState = async (slot: number) => {
    if (!gameId) return

    try {
      const stateData = await loadState(gameId, slot)
      if (!stateData) {
        throw new Error('Save state not found')
      }

      const success = await emulatorRef.current?.loadState(stateData)
      if (success) {
        addToast('success', `Loaded slot ${slot + 1}`)
      } else {
        addToast('error', 'Failed to restore state - emulator may not support this feature')
      }
      // Note: Don't resume here - closeSaveModal will handle resume with delay
      // to prevent button press from being sent to game
    } catch (err) {
      addToast('error', `Failed to load state: ${(err as Error).message}`)
      throw err
    }
  }

  const handleScreenshot = async () => {
    if (!gameId) return

    try {
      const data = await emulatorRef.current?.screenshot()
      if (data) {
        // Save to configured screenshots path
        await window.electronAPI.saves.saveScreenshot(gameId, data)
        addToast('success', 'Screenshot saved')
      }
    } catch (err) {
      addToast('error', 'Failed to capture screenshot')
    }
  }

  // Execute hotkey action
  const executeHotkeyAction = useCallback((action: EmulatorHotkeyAction) => {
    switch (action) {
      case 'quickSave':
        emulatorRef.current?.quickSave()
        // Defer toast to avoid setState during render
        setTimeout(() => addToast('success', 'Quick saved'), 0)
        break
      case 'quickLoad':
        emulatorRef.current?.quickLoad()
        // Defer toast to avoid setState during render
        setTimeout(() => addToast('success', 'Quick loaded'), 0)
        break
      case 'screenshot':
        handleScreenshot()
        break
      case 'fastForward':
        setIsFastForward(prev => {
          const newState = !prev
          emulatorRef.current?.setFastForward(newState)
          // Defer toast to avoid setState during render
          setTimeout(() => addToast('info', newState ? 'Fast forward ON' : 'Fast forward OFF'), 0)
          return newState
        })
        break
      case 'saveState':
        openSaveModal()
        break
      case 'loadState':
        openLoadModal()
        break
      case 'rewind':
        // Rewind is typically a hold action, but we'll toggle it for key press
        setTimeout(() => addToast('info', 'Rewind not available for this core'), 0)
        break
      case 'pause':
        togglePause()
        break
      case 'mute':
        emulatorRef.current?.toggleMute()
        // Defer toast to avoid setState during render
        setTimeout(() => addToast('info', 'Mute toggled'), 0)
        break
      case 'fullscreen':
        toggleFullscreen()
        break
      case 'none':
      default:
        break
    }
  }, [addToast, handleScreenshot, openSaveModal, openLoadModal, togglePause, toggleFullscreen])

  // Handle keyboard shortcuts and Steam Input translation
  // Steam Input on Steam Deck sends: Arrow keys for D-pad, Enter for A, Escape for B
  // EmulatorJS expects: Arrow keys for D-pad, 'x' for A, 'z' for B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if a gamepad is connected
      const service = getGamepadService()
      const hasGamepad = service.getGamepads().length > 0

      console.log('[EmulatorView] Key:', e.key, 'Gamepad:', hasGamepad ? 'yes' : 'no')

      // Steam Input keyboard translation (only when no gamepad is detected)
      // This allows Steam Deck users to play when Steam Input is in keyboard mode
      if (!hasGamepad) {
        // Enter (Steam A button) → 'x' (EmulatorJS A button)
        if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          dispatchKeyToEmulator('x', 'keydown')
          console.log('[EmulatorView] Translated Enter → x (A button)')
          return
        }

        // Escape (Steam B button) → 'z' (EmulatorJS B button)
        // Note: When no gamepad, Escape is used for B button, not exit
        // Use Backspace or P+menu to exit instead
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          dispatchKeyToEmulator('z', 'keydown')
          console.log('[EmulatorView] Translated Escape → z (B button)')
          return
        }

        // Space (Steam Start button?) → Enter (EmulatorJS Start)
        // Since Enter is now used for A button, Space becomes Start
        if (e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          dispatchKeyToEmulator('Enter', 'keydown')
          console.log('[EmulatorView] Translated Space → Enter (Start button)')
          return
        }

        // Tab (Steam Select button?) → Shift (EmulatorJS Select)
        if (e.key === 'Tab') {
          e.preventDefault()
          e.stopPropagation()
          dispatchKeyToEmulator('Shift', 'keydown')
          console.log('[EmulatorView] Translated Tab → Shift (Select button)')
          return
        }

        // Backspace → exit game (since Escape is used for B button)
        if (e.key === 'Backspace') {
          e.preventDefault()
          handleExit()
          return
        }
      } else {
        // When gamepad is connected, Escape exits (normal behavior)
        if (e.key === 'Escape') {
          e.preventDefault()
          handleExit()
          return
        }
      }

      // Handle P for pause/menu (works regardless of gamepad)
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        // Open menu instead of just pausing - provides a way to exit
        if (!menuModalOpen && !saveModalOpen) {
          setMenuModalOpen(true)
          emulatorRef.current?.pause()
          setIsPaused(true)
        }
        return
      }

      // Handle configurable F1-F12 hotkeys
      const fKeyMatch = e.key.match(/^F(\d+)$/)
      if (fKeyMatch) {
        const fKeyNum = parseInt(fKeyMatch[1])
        if (fKeyNum >= 1 && fKeyNum <= 12) {
          const action = emulatorHotkeys[e.key] as EmulatorHotkeyAction
          if (action && action !== 'none') {
            e.preventDefault()
            executeHotkeyAction(action)
          }
        }
      }
    }

    // Also handle keyup for proper key release translation
    const handleKeyUp = (e: KeyboardEvent) => {
      const service = getGamepadService()
      const hasGamepad = service.getGamepads().length > 0

      if (!hasGamepad) {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          dispatchKeyToEmulator('x', 'keyup')
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          dispatchKeyToEmulator('z', 'keyup')
          return
        }
        if (e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          dispatchKeyToEmulator('Enter', 'keyup')
          return
        }
        if (e.key === 'Tab') {
          e.preventDefault()
          e.stopPropagation()
          dispatchKeyToEmulator('Shift', 'keyup')
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isPaused, emulatorHotkeys, executeHotkeyAction, handleExit, menuModalOpen, saveModalOpen])

  // Error state
  if (error) {
    return (
      <div className="h-screen w-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Failed to Start Game</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button
            onClick={() => navigate(`/game/${gameId}`, { replace: true })}
            className="px-6 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium"
          >
            Return to Game Details
          </button>
        </div>
      </div>
    )
  }

  // Not found state
  if (!game) {
    return (
      <div className="h-screen w-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Game not found</h2>
          <button
            onClick={() => navigate('/')}
            className="text-accent hover:underline"
          >
            Return to Library
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-black overflow-hidden"
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-surface-950">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
            <p className="text-surface-400">Loading {game.title}...</p>
          </div>
        </div>
      )}

      {/* Emulator canvas */}
      {gameId && (
        <EmulatorCanvas
          ref={emulatorRef}
          gameId={gameId}
          onStart={handleEmulatorStart}
          onStop={handleEmulatorStop}
          onError={handleEmulatorError}
        />
      )}

      {/* HUD overlay */}
      <EmulatorHUD
        gameTitle={game.title}
        isPaused={isPaused}
        onPause={() => {
          emulatorRef.current?.pause()
          setIsPaused(true)
        }}
        onResume={() => {
          emulatorRef.current?.resume()
          setIsPaused(false)
        }}
        onSaveState={openSaveModal}
        onLoadState={openLoadModal}
        onScreenshot={handleScreenshot}
        onExit={handleExit}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        showHUD={showHUD}
      />

      {/* Save/Load modal */}
      {gameId && (
        <SaveStateModal
          isOpen={saveModalOpen}
          onClose={closeSaveModal}
          gameId={gameId}
          mode={saveModalMode}
          onSave={handleSaveState}
          onLoad={handleLoadState}
        />
      )}

      {/* Menu modal */}
      <EmulatorMenuModal
        isOpen={menuModalOpen}
        onClose={closeMenuModal}
        isPaused={isPaused}
        onSaveState={openSaveModal}
        onLoadState={openLoadModal}
        onScreenshot={handleScreenshot}
        onPause={() => {
          emulatorRef.current?.pause()
          setIsPaused(true)
        }}
        onResume={() => {
          // Delay resume to prevent button press from being sent to game
          setTimeout(() => {
            emulatorRef.current?.resume()
            setIsPaused(false)
          }, 100)
        }}
        onExit={handleExit}
      />
    </div>
  )
}
