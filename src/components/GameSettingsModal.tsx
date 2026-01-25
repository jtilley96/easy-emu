import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { X, ChevronDown, Check } from 'lucide-react'
import { Game, EmulatorInfo } from '../types'
import { useUIStore } from '../store/uiStore'
import { useLibraryStore } from '../store/libraryStore'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'

interface GameSettingsModalProps {
  game: Game
  isOpen: boolean
  onClose: () => void
}

export default function GameSettingsModal({ game, isOpen, onClose }: GameSettingsModalProps) {
  const [preferredEmulator, setPreferredEmulator] = useState<string>(game.preferredEmulator ?? '')
  const [emulators, setEmulators] = useState<EmulatorInfo[]>([])
  const [saving, setSaving] = useState(false)
  const [focusedField, setFocusedField] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownIndex, setDropdownIndex] = useState(0)
  const { addToast } = useUIStore()
  const updateGame = useLibraryStore(s => s.updateGame)
  
  // Refs for focusable elements
  const cancelRef = useRef<HTMLButtonElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)
  
  // Prevent A button from firing immediately after modal opens
  const justOpenedRef = useRef(true)
  
  // Field navigation order
  const fields = ['emulator', 'cancel', 'save'] as const
  
  // Build dropdown options (default + emulators) - memoized to prevent effect re-runs
  const dropdownOptions = useMemo(() => [
    { value: '', label: 'Default (use platform default)' },
    ...emulators.map(emu => ({ value: emu.id, label: emu.name }))
  ], [emulators])

  useEffect(() => {
    if (isOpen) {
      setPreferredEmulator(game.preferredEmulator ?? '')
      setFocusedField(0)
      setDropdownOpen(false)
      justOpenedRef.current = true
      
      // Clear navigation guard after short delay
      const timeout = setTimeout(() => {
        justOpenedRef.current = false
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [game, isOpen])
  
  // Sync dropdown index with current value when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      const currentIndex = dropdownOptions.findIndex(opt => opt.value === preferredEmulator)
      setDropdownIndex(currentIndex >= 0 ? currentIndex : 0)
    }
  }, [dropdownOpen, preferredEmulator, dropdownOptions])
  
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    // Handle dropdown navigation
    if (dropdownOpen) {
      if (direction === 'up') {
        setDropdownIndex(prev => Math.max(0, prev - 1))
      } else if (direction === 'down') {
        setDropdownIndex(prev => Math.min(dropdownOptions.length - 1, prev + 1))
      }
      return
    }
    
    // Normal field navigation
    if (direction === 'up') {
      setFocusedField(prev => Math.max(0, prev - 1))
    } else if (direction === 'down') {
      setFocusedField(prev => Math.min(fields.length - 1, prev + 1))
    } else if (direction === 'left' && focusedField === fields.indexOf('save')) {
      setFocusedField(fields.indexOf('cancel'))
    } else if (direction === 'right' && focusedField === fields.indexOf('cancel')) {
      setFocusedField(fields.indexOf('save'))
    }
  }, [dropdownOpen, dropdownOptions.length, focusedField, fields])
  
  const handleConfirm = useCallback(() => {
    if (justOpenedRef.current) return
    
    // Handle dropdown selection
    if (dropdownOpen) {
      const selected = dropdownOptions[dropdownIndex]
      if (selected) {
        setPreferredEmulator(selected.value)
        setDropdownOpen(false)
      }
      return
    }
    
    const field = fields[focusedField]
    switch (field) {
      case 'emulator':
        setDropdownOpen(true)
        break
      case 'cancel':
        onClose()
        break
      case 'save':
        handleSave()
        break
    }
  }, [dropdownOpen, dropdownIndex, dropdownOptions, focusedField, fields, onClose])
  
  const handleBack = useCallback(() => {
    if (dropdownOpen) {
      setDropdownOpen(false)
      return
    }
    onClose()
  }, [dropdownOpen, onClose])
  
  // Gamepad navigation
  useGamepadNavigation({
    enabled: isOpen,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  useEffect(() => {
    if (!isOpen) return
    window.electronAPI.emulators.detect().then(results => {
      setEmulators(
        (results as EmulatorInfo[]).filter(
          e => e.installed && e.enabled !== false && e.platforms.includes(game.platform)
        )
      )
    })
  }, [isOpen, game.platform])

  const handleSave = async () => {
    setSaving(true)
    try {
      const value = preferredEmulator.trim() || undefined
      await updateGame(game.id, { preferredEmulator: value })
      addToast('success', 'Game settings saved')
      onClose()
    } catch (error) {
      console.error('Failed to save game settings:', error)
      addToast('error', 'Failed to save game settings')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <h2 className="text-xl font-bold">Game Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-surface-400 text-sm">
            Override which emulator to use when launching <strong>{game.title}</strong>.
          </p>

          <div>
            <label className="block text-sm font-medium mb-2">Preferred emulator</label>
            <div className="relative">
              {/* Custom dropdown trigger */}
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`w-full bg-surface-800 border rounded px-3 py-2 text-left flex items-center justify-between transition-all ${
                  focusedField === fields.indexOf('emulator') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
                }`}
              >
                <span>{dropdownOptions.find(opt => opt.value === preferredEmulator)?.label || 'Default (use platform default)'}</span>
                <ChevronDown size={18} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-10 max-h-48 overflow-auto">
                  {dropdownOptions.map((option, index) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPreferredEmulator(option.value)
                        setDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between transition-all ${
                        dropdownIndex === index ? 'bg-accent text-white' : 'hover:bg-surface-700'
                      } ${index === 0 ? 'rounded-t-lg' : ''} ${index === dropdownOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                    >
                      <span>{option.label}</span>
                      {preferredEmulator === option.value && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-800">
          <button
            ref={cancelRef}
            onClick={onClose}
            className={`px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg transition-all ${
              focusedField === fields.indexOf('cancel') ? 'ring-2 ring-accent' : ''
            }`}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            ref={saveRef}
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg disabled:opacity-50 transition-all ${
              focusedField === fields.indexOf('save') ? 'ring-2 ring-white' : ''
            }`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
