import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import EmulatorCanvas, { EmulatorCanvasRef } from '../components/emulator/EmulatorCanvas'
import EmulatorHUD from '../components/emulator/EmulatorHUD'
import SaveStateModal from '../components/emulator/SaveStateModal'
import { useEmulatorStore } from '../store/emulatorStore'
import { useLibraryStore } from '../store/libraryStore'
import { useUIStore } from '../store/uiStore'

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
  const [sessionStartTime] = useState(Date.now())

  const hideHUDTimeout = useRef<NodeJS.Timeout | null>(null)

  const game = games.find(g => g.id === gameId)

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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          handleExit()
          break
        case 'p':
        case 'P':
          e.preventDefault()
          togglePause()
          break
        case 'F5':
          e.preventDefault()
          openSaveModal()
          break
        case 'F8':
          e.preventDefault()
          openLoadModal()
          break
        case 'F12':
          e.preventDefault()
          handleScreenshot()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPaused])

  // Auto-hide HUD after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowHUD(true)
      if (hideHUDTimeout.current) {
        clearTimeout(hideHUDTimeout.current)
      }
      hideHUDTimeout.current = setTimeout(() => {
        if (!isPaused && !saveModalOpen) {
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
  }, [isPaused, saveModalOpen])

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
    navigate(`/game/${gameId}`)
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
    setSaveModalMode('save')
    setSaveModalOpen(true)
    emulatorRef.current?.pause()
    setIsPaused(true)
  }

  const openLoadModal = () => {
    setSaveModalMode('load')
    setSaveModalOpen(true)
    emulatorRef.current?.pause()
    setIsPaused(true)
  }

  const closeSaveModal = () => {
    setSaveModalOpen(false)
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

      await emulatorRef.current?.loadState(stateData)
      addToast('success', `Loaded slot ${slot + 1}`)

      // Resume after loading
      emulatorRef.current?.resume()
      setIsPaused(false)
    } catch (err) {
      addToast('error', `Failed to load state: ${(err as Error).message}`)
      throw err
    }
  }

  const handleScreenshot = async () => {
    try {
      const data = await emulatorRef.current?.screenshot()
      if (data) {
        // Create blob and trigger download
        const blob = new Blob([data], { type: 'image/png' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${game?.title || 'screenshot'}_${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
        addToast('success', 'Screenshot saved')
      }
    } catch (err) {
      addToast('error', 'Failed to capture screenshot')
    }
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen w-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Failed to Start Game</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button
            onClick={() => navigate(`/game/${gameId}`)}
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
    </div>
  )
}
