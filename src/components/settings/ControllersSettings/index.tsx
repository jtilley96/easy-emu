import { useState, useEffect, useCallback } from 'react'
import { Gamepad2, Keyboard, RefreshCw, Settings2 } from 'lucide-react'
import { useInputStore } from '../../../store/inputStore'
import { useUIStore } from '../../../store/uiStore'
import { useGamepad } from '../../../hooks/useGamepad'
import { useGamepadNavigation } from '../../../hooks/useGamepadNavigation'
import DetectedControllers from './DetectedControllers'
import ControllerProfileEditor from './ControllerProfileEditor'
import KeyboardShortcutsSection from './KeyboardShortcutsSection'
import { SettingsSectionProps } from '../../../types'

export default function ControllersSettings({ isFocused, focusedRow, focusedCol: _focusedCol, onFocusChange, onGridChange, onBack, justActivatedRef, scrollRef }: SettingsSectionProps) {
  const { gamepads } = useGamepad()
  const {
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

  // 5 rows: refresh, configure mapping, deadzone, repeat delay, repeat rate
  useEffect(() => {
    onGridChange({ rows: 5, cols: [1, 1, 1, 1, 1] })
  }, [onGridChange])

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

  // Helper to check if row is focused
  const isRowFocused = (row: number) => {
    return isFocused && focusedRow === row
  }

  // Handle gamepad confirmation
  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return
    
    if (focusedRow === 0) {
      navigator.getGamepads()
      addToast('info', 'Controllers refreshed')
    } else if (focusedRow === 1) {
      handleEditProfile()
    }
    // Sliders don't need confirm - they're adjusted via left/right
  }, [focusedRow, addToast, justActivatedRef])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isFocused && !showProfileEditor,
    onNavigate: (direction) => {
      if (direction === 'up') {
        if (focusedRow === 0) {
          onBack()
        } else {
          onFocusChange(focusedRow - 1, 0)
        }
      } else if (direction === 'down') {
        if (focusedRow < 4) {
          onFocusChange(focusedRow + 1, 0)
        }
      } else if (direction === 'left') {
        // Handle slider adjustments
        if (focusedRow === 2) {
          setAnalogDeadzone(Math.max(0, analogDeadzone - 0.05))
        } else if (focusedRow === 3) {
          setDpadRepeatDelay(Math.max(200, dpadRepeatDelay - 50))
        } else if (focusedRow === 4) {
          setDpadRepeatRate(Math.max(50, dpadRepeatRate - 10))
        } else {
          onBack()
        }
      } else if (direction === 'right') {
        // Handle slider adjustments
        if (focusedRow === 2) {
          setAnalogDeadzone(Math.min(0.5, analogDeadzone + 0.05))
        } else if (focusedRow === 3) {
          setDpadRepeatDelay(Math.min(1000, dpadRepeatDelay + 50))
        } else if (focusedRow === 4) {
          setDpadRepeatRate(Math.min(300, dpadRepeatRate + 10))
        }
      }
    },
    onConfirm: handleConfirm,
    onBack,
    scrollRef
  })

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
            data-focus-row={0}
            data-focus-col={0}
            onClick={() => {
              // Force a re-poll of gamepads
              navigator.getGamepads()
              addToast('info', 'Controllers refreshed')
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-all ${
              isRowFocused(0)
                ? 'bg-accent text-white ring-2 ring-accent scale-105'
                : 'bg-surface-700 hover:bg-surface-600'
            }`}
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
              data-focus-row={1}
              data-focus-col={0}
              onClick={handleEditProfile}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isRowFocused(1)
                  ? 'bg-accent text-white ring-2 ring-accent scale-105'
                  : 'bg-surface-700 hover:bg-surface-600'
              }`}
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
          <div 
            data-focus-row={2}
            data-focus-col={0}
            className={`bg-surface-800 rounded-lg p-4 transition-all ${
              isRowFocused(2) ? 'ring-2 ring-accent' : ''
            }`}
          >
            <label className="block text-sm font-medium mb-2">
              Analog Stick Deadzone: {(analogDeadzone * 100).toFixed(0)}%
              {isRowFocused(2) && <span className="text-accent ml-2">← → to adjust</span>}
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

          <div 
            data-focus-row={3}
            data-focus-col={0}
            className={`bg-surface-800 rounded-lg p-4 transition-all ${
              isRowFocused(3) ? 'ring-2 ring-accent' : ''
            }`}
          >
            <label className="block text-sm font-medium mb-2">
              D-Pad Repeat Delay: {dpadRepeatDelay}ms
              {isRowFocused(3) && <span className="text-accent ml-2">← → to adjust</span>}
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

          <div 
            data-focus-row={4}
            data-focus-col={0}
            className={`bg-surface-800 rounded-lg p-4 transition-all ${
              isRowFocused(4) ? 'ring-2 ring-accent' : ''
            }`}
          >
            <label className="block text-sm font-medium mb-2">
              D-Pad Repeat Rate: {dpadRepeatRate}ms
              {isRowFocused(4) && <span className="text-accent ml-2">← → to adjust</span>}
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
