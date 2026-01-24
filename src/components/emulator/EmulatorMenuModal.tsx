import { useState, useCallback, useEffect } from 'react'
import { Save, FolderOpen, Camera, Pause, Play, X, LogOut } from 'lucide-react'
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation'

interface MenuOption {
  id: string
  label: string
  icon: React.ReactNode
  action: () => void
}

interface EmulatorMenuModalProps {
  isOpen: boolean
  onClose: () => void
  isPaused: boolean
  onSaveState: () => void
  onLoadState: () => void
  onScreenshot: () => void
  onPause: () => void
  onResume: () => void
  onExit: () => void
}

export default function EmulatorMenuModal({
  isOpen,
  onClose,
  isPaused,
  onSaveState,
  onLoadState,
  onScreenshot,
  onPause,
  onResume,
  onExit
}: EmulatorMenuModalProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)

  const menuOptions: MenuOption[] = [
    {
      id: 'save',
      label: 'Save State',
      icon: <Save size={20} />,
      action: () => {
        onSaveState()
        onClose()
      }
    },
    {
      id: 'load',
      label: 'Load State',
      icon: <FolderOpen size={20} />,
      action: () => {
        onLoadState()
        onClose()
      }
    },
    {
      id: 'screenshot',
      label: 'Screenshot',
      icon: <Camera size={20} />,
      action: () => {
        onScreenshot()
        onClose()
      }
    },
    {
      id: 'pause',
      label: isPaused ? 'Resume' : 'Pause',
      icon: isPaused ? <Play size={20} /> : <Pause size={20} />,
      action: () => {
        if (isPaused) {
          onResume()
        } else {
          onPause()
        }
        onClose()
      }
    },
    {
      id: 'exit',
      label: 'Exit Game',
      icon: <LogOut size={20} />,
      action: () => {
        onExit()
        onClose()
      }
    }
  ]

  // Reset focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0)
    }
  }, [isOpen])

  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (direction === 'up') {
      setFocusedIndex(prev => Math.max(0, prev - 1))
    } else if (direction === 'down') {
      setFocusedIndex(prev => Math.min(menuOptions.length - 1, prev + 1))
    }
  }, [menuOptions.length])

  const handleConfirm = useCallback(() => {
    const option = menuOptions[focusedIndex]
    if (option) {
      option.action()
    }
  }, [focusedIndex, menuOptions])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isOpen,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: onClose
  })

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          handleNavigate('up')
          break
        case 'ArrowDown':
          e.preventDefault()
          handleNavigate('down')
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleConfirm()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleNavigate, handleConfirm, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <h2 className="text-xl font-semibold">Game Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-700 transition-colors"
            title="Close (B)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu Options */}
        <div className="p-4">
          <div className="space-y-2">
            {menuOptions.map((option, index) => (
              <button
                key={option.id}
                onClick={option.action}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  focusedIndex === index
                    ? 'bg-accent text-white scale-[1.02] shadow-lg bp-focus'
                    : 'bg-surface-800 hover:bg-surface-700 text-surface-300'
                }`}
              >
                {option.icon}
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-surface-700 bg-surface-800/50">
          <p className="text-sm text-surface-400 text-center">
            Use D-pad to navigate, A to select, B to close
          </p>
        </div>
      </div>
    </div>
  )
}
