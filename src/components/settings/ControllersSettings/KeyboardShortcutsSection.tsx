import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useInputStore, ACTION_LABELS } from '../../../store/inputStore'
import { useUIStore } from '../../../store/uiStore'
import { formatShortcut, useKeyCapture } from '../../../hooks/useKeyboardShortcuts'

const SHORTCUT_GROUPS = [
  {
    title: 'Application',
    shortcuts: ['toggleFullscreen', 'focusSearch', 'openSettings', 'toggleBigPicture', 'back']
  },
  {
    title: 'Emulation',
    shortcuts: ['pauseGame', 'saveState', 'loadState', 'screenshot']
  }
]

export default function KeyboardShortcutsSection() {
  const { keyboardShortcuts, updateKeyboardShortcut, loadSettings } = useInputStore()
  const { addToast } = useUIStore()
  const [capturingAction, setCapturingAction] = useState<string | null>(null)

  const handleStartCapture = (action: string) => {
    setCapturingAction(action)
  }

  const handleCaptureKey = (shortcut: string) => {
    if (capturingAction) {
      updateKeyboardShortcut(capturingAction, shortcut)
      setCapturingAction(null)
      addToast('success', 'Shortcut updated')
    }
  }

  const handleReset = async () => {
    // Clear custom shortcuts by reloading defaults
    await window.electronAPI.config.set('keyboardShortcuts', {})
    await loadSettings()
    addToast('info', 'Shortcuts reset to defaults')
  }

  // Use key capture when we're capturing
  useKeyCapture(handleCaptureKey, capturingAction !== null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-surface-400 text-sm">
          Click on a shortcut to rebind it. Press any key combination to assign it.
        </p>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm"
        >
          <RotateCcw size={14} />
          Reset All
        </button>
      </div>

      <div className="space-y-6">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title}>
            <h4 className="text-sm font-medium text-surface-400 mb-2">{group.title}</h4>
            <div className="space-y-1">
              {group.shortcuts.map((action) => (
                <div
                  key={action}
                  className="flex items-center justify-between p-3 bg-surface-800 rounded-lg"
                >
                  <span className="font-medium">
                    {ACTION_LABELS[action] || action}
                  </span>
                  <button
                    onClick={() => handleStartCapture(action)}
                    className={`px-3 py-1.5 rounded text-sm font-mono min-w-[100px] text-center ${
                      capturingAction === action
                        ? 'bg-accent text-white animate-pulse'
                        : 'bg-surface-700 hover:bg-surface-600'
                    }`}
                  >
                    {capturingAction === action
                      ? 'Press key...'
                      : formatShortcut(keyboardShortcuts[action] || '')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Capture overlay when active */}
      {capturingAction && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={() => setCapturingAction(null)}
        >
          <div
            className="bg-surface-800 rounded-xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">
              Press a Key for "{ACTION_LABELS[capturingAction]}"
            </h3>
            <p className="text-surface-400 mb-4">
              Press any key or combination (Ctrl+Key, etc.)
            </p>
            <button
              onClick={() => setCapturingAction(null)}
              className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
