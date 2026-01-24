import { useState, useEffect } from 'react'
import { Gamepad2, Keyboard, Monitor, RefreshCw, Settings2 } from 'lucide-react'
import { useInputStore } from '../../../store/inputStore'
import { useUIStore } from '../../../store/uiStore'
import { useGamepad } from '../../../hooks/useGamepad'
import DetectedControllers from './DetectedControllers'
import ControllerProfileEditor from './ControllerProfileEditor'
import KeyboardShortcutsSection from './KeyboardShortcutsSection'

export default function ControllersSettings() {
  const { gamepads } = useGamepad()
  const {
    isBigPictureMode,
    setBigPictureMode,
    bigPictureOnStartup,
    setBigPictureOnStartup,
    bigPictureCardSize,
    setBigPictureCardSize,
    analogDeadzone,
    setAnalogDeadzone,
    dpadRepeatDelay,
    setDpadRepeatDelay,
    dpadRepeatRate,
    setDpadRepeatRate,
    loadSettings
  } = useInputStore()
  const { addToast } = useUIStore()

  const [selectedControllerIndex, setSelectedControllerIndex] = useState<number | null>(null)
  const [showProfileEditor, setShowProfileEditor] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Auto-select first controller when available
  useEffect(() => {
    if (selectedControllerIndex === null && gamepads.length > 0) {
      setSelectedControllerIndex(gamepads[0].index)
    }
    // Clear selection if controller disconnected
    if (selectedControllerIndex !== null) {
      const stillExists = gamepads.some(g => g.index === selectedControllerIndex)
      if (!stillExists) {
        setSelectedControllerIndex(gamepads.length > 0 ? gamepads[0].index : null)
      }
    }
  }, [gamepads, selectedControllerIndex])

  const selectedController = gamepads.find(g => g.index === selectedControllerIndex) ?? null

  const handleEditProfile = () => {
    if (selectedController) {
      setShowProfileEditor(true)
    }
  }

  const handleCloseProfileEditor = () => {
    setShowProfileEditor(false)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Controller Settings</h2>

      {/* Detected Controllers */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gamepad2 size={20} />
            Detected Controllers
          </h3>
          <button
            onClick={() => {
              // Force a re-poll of gamepads
              navigator.getGamepads()
              addToast('info', 'Controllers refreshed')
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <DetectedControllers
          gamepads={gamepads}
          selectedIndex={selectedControllerIndex}
          onSelect={setSelectedControllerIndex}
        />

        {selectedController && (
          <div className="mt-4">
            <button
              onClick={handleEditProfile}
              className="flex items-center gap-2 px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg"
            >
              <Settings2 size={16} />
              Configure Controller Mapping
            </button>
          </div>
        )}
      </section>

      {/* Gamepad Settings */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Gamepad Settings</h3>

        <div className="space-y-4">
          <div className="bg-surface-800 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">
              Analog Stick Deadzone: {(analogDeadzone * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              value={analogDeadzone * 100}
              onChange={(e) => setAnalogDeadzone(parseInt(e.target.value) / 100)}
              className="w-full accent-accent"
            />
            <p className="text-surface-400 text-xs mt-1">
              Amount of stick movement to ignore as noise
            </p>
          </div>

          <div className="bg-surface-800 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">
              D-Pad Repeat Delay: {dpadRepeatDelay}ms
            </label>
            <input
              type="range"
              min="200"
              max="1000"
              step="50"
              value={dpadRepeatDelay}
              onChange={(e) => setDpadRepeatDelay(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
            <p className="text-surface-400 text-xs mt-1">
              How long to hold before navigation repeats
            </p>
          </div>

          <div className="bg-surface-800 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">
              D-Pad Repeat Rate: {dpadRepeatRate}ms
            </label>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={dpadRepeatRate}
              onChange={(e) => setDpadRepeatRate(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
            <p className="text-surface-400 text-xs mt-1">
              How fast navigation repeats when held
            </p>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Keyboard size={20} />
          Keyboard Shortcuts
        </h3>
        <KeyboardShortcutsSection />
      </section>

      {/* Big Picture Settings */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Monitor size={20} />
          Big Picture Mode
        </h3>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isBigPictureMode}
              onChange={(e) => setBigPictureMode(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <div>
              <span className="font-medium">Enable Big Picture Mode</span>
              <p className="text-surface-400 text-sm">
                Switch to a controller-friendly 10-foot interface
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={bigPictureOnStartup}
              onChange={(e) => setBigPictureOnStartup(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <div>
              <span className="font-medium">Start in Big Picture Mode</span>
              <p className="text-surface-400 text-sm">
                Launch EasyEmu directly into Big Picture mode
              </p>
            </div>
          </label>

          <div className="bg-surface-800 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">Card Size</label>
            <select
              value={bigPictureCardSize}
              onChange={(e) => setBigPictureCardSize(e.target.value as 'small' | 'medium' | 'large')}
              className="w-full bg-surface-900 border border-surface-700 rounded px-3 py-2 text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </section>

      {/* Controller Profile Editor Modal */}
      {showProfileEditor && selectedController && (
        <ControllerProfileEditor
          controller={selectedController}
          onClose={handleCloseProfileEditor}
        />
      )}
    </div>
  )
}
