import { useState } from 'react'
import {
  Play,
  Pause,
  Save,
  FolderOpen,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  X
} from 'lucide-react'
import { useEmulatorStore } from '../../store/emulatorStore'

interface EmulatorHUDProps {
  gameTitle: string
  isPaused: boolean
  onPause: () => void
  onResume: () => void
  onSaveState: () => void
  onLoadState: () => void
  onScreenshot: () => void
  onExit: () => void
  onToggleFullscreen: () => void
  isFullscreen: boolean
  showHUD: boolean
}

export default function EmulatorHUD({
  gameTitle,
  isPaused,
  onPause,
  onResume,
  onSaveState,
  onLoadState,
  onScreenshot,
  onExit,
  onToggleFullscreen,
  isFullscreen,
  showHUD
}: EmulatorHUDProps) {
  const { volume, isMuted, setVolume, setMuted } = useEmulatorStore()
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (newVolume > 0 && isMuted) {
      setMuted(false)
    }
  }

  const toggleMute = () => {
    setMuted(!isMuted)
  }

  if (!showHUD) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onExit}
              className="p-2 rounded-lg bg-surface-800/80 hover:bg-surface-700/80 backdrop-blur-sm transition-colors"
              title="Exit (Escape)"
            >
              <X size={20} />
            </button>
            <h1 className="text-lg font-semibold truncate max-w-md">{gameTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Volume control */}
            <div
              className="relative"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg bg-surface-800/80 hover:bg-surface-700/80 backdrop-blur-sm transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              {showVolumeSlider && (
                <div className="absolute top-full right-0 mt-2 p-3 bg-surface-800/95 backdrop-blur-sm rounded-lg shadow-lg">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-2 bg-surface-600 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="text-xs text-center mt-1 text-surface-400">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg bg-surface-800/80 hover:bg-surface-700/80 backdrop-blur-sm transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
        <div className="flex items-center justify-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={isPaused ? onResume : onPause}
            className="p-3 rounded-full bg-accent hover:bg-accent-hover transition-colors"
            title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
          >
            {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} />}
          </button>

          <div className="w-px h-8 bg-surface-600" />

          {/* Save State */}
          <button
            onClick={onSaveState}
            className="p-2 rounded-lg bg-surface-800/80 hover:bg-surface-700/80 backdrop-blur-sm transition-colors"
            title="Save State (F5)"
          >
            <Save size={20} />
          </button>

          {/* Load State */}
          <button
            onClick={onLoadState}
            className="p-2 rounded-lg bg-surface-800/80 hover:bg-surface-700/80 backdrop-blur-sm transition-colors"
            title="Load State (F8)"
          >
            <FolderOpen size={20} />
          </button>

          <div className="w-px h-8 bg-surface-600" />

          {/* Screenshot */}
          <button
            onClick={onScreenshot}
            className="p-2 rounded-lg bg-surface-800/80 hover:bg-surface-700/80 backdrop-blur-sm transition-colors"
            title="Screenshot (F12)"
          >
            <Camera size={20} />
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-20 left-4 text-xs text-surface-500 bg-black/50 px-2 py-1 rounded">
        ESC: Exit | Space: Pause | F5: Save | F8: Load
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-auto">
          <div className="text-center">
            <Pause size={64} className="mx-auto mb-4 text-white/80" />
            <p className="text-xl font-semibold text-white/80">Paused</p>
            <p className="text-sm text-white/60 mt-2">Press Space to resume</p>
          </div>
        </div>
      )}
    </div>
  )
}
