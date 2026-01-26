import { useState, useEffect, useCallback } from 'react'
import { Keyboard } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation'
import type { SettingsSectionProps, EmulatorHotkeyAction } from '../../types'

interface HotkeyOption {
  value: EmulatorHotkeyAction
  label: string
  description: string
}

const HOTKEY_OPTIONS: HotkeyOption[] = [
  { value: 'none', label: 'None', description: 'No action assigned' },
  { value: 'quickSave', label: 'Quick Save', description: 'Save to quick slot (EmulatorJS internal)' },
  { value: 'quickLoad', label: 'Quick Load', description: 'Load from quick slot (EmulatorJS internal)' },
  { value: 'screenshot', label: 'Screenshot', description: 'Capture and save screenshot' },
  { value: 'fastForward', label: 'Fast Forward', description: 'Toggle fast forward mode' },
  { value: 'saveState', label: 'Save State', description: 'Open save state dialog' },
  { value: 'loadState', label: 'Load State', description: 'Open load state dialog' },
  { value: 'rewind', label: 'Rewind', description: 'Rewind game (if supported by core)' },
  { value: 'pause', label: 'Pause', description: 'Toggle pause/resume' },
  { value: 'mute', label: 'Mute', description: 'Toggle audio mute' },
  { value: 'fullscreen', label: 'Fullscreen', description: 'Toggle fullscreen mode' }
]

const FUNCTION_KEYS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']

const DEFAULT_HOTKEYS: Record<string, EmulatorHotkeyAction> = {
  F1: 'quickSave',
  F2: 'quickLoad',
  F3: 'screenshot',
  F4: 'fastForward',
  F5: 'saveState',
  F6: 'loadState',
  F7: 'rewind',
  F8: 'pause',
  F9: 'mute',
  F10: 'fullscreen',
  F11: 'none',
  F12: 'none'
}

export default function ControllersSettings({
  isFocused,
  focusedRow,
  focusedCol: _focusedCol,
  onFocusChange,
  onGridChange,
  onBack,
  justActivatedRef,
  scrollRef
}: SettingsSectionProps) {
  const { addToast } = useUIStore()
  const [hotkeys, setHotkeys] = useState<Record<string, EmulatorHotkeyAction>>({})
  const [loading, setLoading] = useState(true)
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)

  // Grid: 12 rows (F1-F12), 1 column each
  useEffect(() => {
    onGridChange({ rows: FUNCTION_KEYS.length, cols: FUNCTION_KEYS.map(() => 1) })
  }, [onGridChange])

  // Load hotkeys from config
  useEffect(() => {
    const loadHotkeys = async () => {
      try {
        const savedHotkeys = await window.electronAPI.config.get('emulatorHotkeys')
        if (savedHotkeys && typeof savedHotkeys === 'object') {
          setHotkeys({ ...DEFAULT_HOTKEYS, ...(savedHotkeys as Record<string, EmulatorHotkeyAction>) })
        } else {
          setHotkeys(DEFAULT_HOTKEYS)
        }
      } catch (error) {
        console.error('Failed to load hotkeys:', error)
        setHotkeys(DEFAULT_HOTKEYS)
      } finally {
        setLoading(false)
      }
    }
    loadHotkeys()
  }, [])

  // Save hotkey change
  const handleHotkeyChange = async (key: string, action: EmulatorHotkeyAction) => {
    const newHotkeys = { ...hotkeys, [key]: action }
    setHotkeys(newHotkeys)
    try {
      await window.electronAPI.config.set('emulatorHotkeys', newHotkeys)
      addToast('success', `${key} set to ${HOTKEY_OPTIONS.find(o => o.value === action)?.label || action}`)
    } catch (error) {
      console.error('Failed to save hotkey:', error)
      addToast('error', 'Failed to save hotkey')
    }
  }

  // Reset all hotkeys to defaults
  const handleResetDefaults = async () => {
    setHotkeys(DEFAULT_HOTKEYS)
    try {
      await window.electronAPI.config.set('emulatorHotkeys', DEFAULT_HOTKEYS)
      addToast('success', 'Hotkeys reset to defaults')
    } catch (error) {
      console.error('Failed to reset hotkeys:', error)
      addToast('error', 'Failed to reset hotkeys')
    }
  }

  // Open dropdown for a key
  const openDropdown = useCallback((key: string) => {
    const currentValue = hotkeys[key] || 'none'
    const currentIndex = HOTKEY_OPTIONS.findIndex(o => o.value === currentValue)
    setOpenDropdownKey(key)
    setSelectedOptionIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [hotkeys])

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setOpenDropdownKey(null)
    setSelectedOptionIndex(0)
  }, [])

  // Confirm dropdown selection
  const confirmDropdownSelection = useCallback(() => {
    if (!openDropdownKey) return
    const selectedOption = HOTKEY_OPTIONS[selectedOptionIndex]
    if (selectedOption) {
      handleHotkeyChange(openDropdownKey, selectedOption.value)
    }
    closeDropdown()
  }, [openDropdownKey, selectedOptionIndex, closeDropdown])

  const isDropdownOpen = openDropdownKey !== null

  // Helper to check if row is focused
  const isRowFocused = (row: number) => isFocused && focusedRow === row && !isDropdownOpen

  // Handle gamepad confirmation
  const handleConfirm = useCallback(() => {
    if (justActivatedRef.current) return

    if (isDropdownOpen) {
      confirmDropdownSelection()
      return
    }

    const key = FUNCTION_KEYS[focusedRow]
    if (key) {
      openDropdown(key)
    }
  }, [focusedRow, isDropdownOpen, confirmDropdownSelection, openDropdown, justActivatedRef])

  // Handle back button
  const handleBackButton = useCallback(() => {
    if (isDropdownOpen) {
      closeDropdown()
    } else {
      onBack()
    }
  }, [isDropdownOpen, closeDropdown, onBack])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isFocused,
    onNavigate: (direction) => {
      if (isDropdownOpen) {
        if (direction === 'up') {
          setSelectedOptionIndex(prev => Math.max(0, prev - 1))
        } else if (direction === 'down') {
          setSelectedOptionIndex(prev => Math.min(HOTKEY_OPTIONS.length - 1, prev + 1))
        }
        return
      }

      if (direction === 'up') {
        if (focusedRow === 0) {
          onBack()
        } else {
          onFocusChange(focusedRow - 1, 0)
        }
      } else if (direction === 'down') {
        if (focusedRow < FUNCTION_KEYS.length - 1) {
          onFocusChange(focusedRow + 1, 0)
        }
      } else if (direction === 'left') {
        onBack()
      }
    },
    onConfirm: handleConfirm,
    onBack: handleBackButton,
    scrollRef
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-surface-400">Loading hotkey settings...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Controller & Hotkey Settings</h2>

      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Keyboard size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Emulator Hotkeys</h3>
        </div>
        <p className="text-surface-400 text-sm mb-4">
          Configure keyboard shortcuts (F1-F12) for emulator actions during gameplay.
          These hotkeys work alongside the gamepad menu (Select button).
        </p>

        <div className="space-y-2">
          {FUNCTION_KEYS.map((key, index) => {
            const currentAction = hotkeys[key] || 'none'
            const currentOption = HOTKEY_OPTIONS.find(o => o.value === currentAction)
            const isThisRowFocused = isRowFocused(index)
            const isThisDropdownOpen = openDropdownKey === key

            return (
              <div
                key={key}
                data-focus-row={index}
                data-focus-col={0}
                className={`bg-surface-800 rounded-lg px-4 py-3 transition-all ${
                  isThisRowFocused || isThisDropdownOpen ? 'ring-2 ring-accent' : ''
                } ${isThisRowFocused ? 'scale-[1.01]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <kbd className="px-3 py-1 bg-surface-900 border border-surface-600 rounded font-mono text-sm min-w-[50px] text-center">
                      {key}
                    </kbd>
                    <span className="text-surface-300 text-sm">=</span>
                  </div>

                  {isThisDropdownOpen ? (
                    <div className="flex-1 ml-4 bg-surface-900 border border-accent rounded overflow-hidden">
                      {HOTKEY_OPTIONS.map((option, optIndex) => (
                        <div
                          key={option.value}
                          className={`px-3 py-2 cursor-pointer transition-colors ${
                            optIndex === selectedOptionIndex
                              ? 'bg-accent text-white'
                              : 'hover:bg-surface-800'
                          }`}
                          onClick={() => {
                            handleHotkeyChange(key, option.value)
                            closeDropdown()
                          }}
                        >
                          <div className="font-medium text-sm">{option.label}</div>
                          <div className={`text-xs ${optIndex === selectedOptionIndex ? 'text-white/80' : 'text-surface-400'}`}>
                            {option.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isThisRowFocused ? (
                    <div
                      className="flex-1 ml-4 flex items-center justify-between bg-surface-900 border border-accent rounded px-3 py-2 cursor-pointer"
                      onClick={() => openDropdown(key)}
                    >
                      <div>
                        <span className="font-medium text-sm">{currentOption?.label || 'None'}</span>
                        <span className="text-surface-400 text-xs ml-2">{currentOption?.description}</span>
                      </div>
                      <span className="text-accent text-xs">Press A</span>
                    </div>
                  ) : (
                    <select
                      value={currentAction}
                      onChange={(e) => handleHotkeyChange(key, e.target.value as EmulatorHotkeyAction)}
                      className="flex-1 ml-4 bg-surface-900 border border-surface-700 rounded px-3 py-2 text-sm"
                    >
                      {HOTKEY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-sm transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Default Hotkey Reference</h3>
        <div className="bg-surface-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F1</kbd>
              <span className="text-surface-400">Quick Save</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F2</kbd>
              <span className="text-surface-400">Quick Load</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F3</kbd>
              <span className="text-surface-400">Screenshot</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F4</kbd>
              <span className="text-surface-400">Fast Forward</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F5</kbd>
              <span className="text-surface-400">Save State (Dialog)</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F6</kbd>
              <span className="text-surface-400">Load State (Dialog)</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F7</kbd>
              <span className="text-surface-400">Rewind</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F8</kbd>
              <span className="text-surface-400">Pause</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F9</kbd>
              <span className="text-surface-400">Mute</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs">F10</kbd>
              <span className="text-surface-400">Fullscreen</span>
            </div>
          </div>
          <p className="text-surface-500 text-xs mt-3">
            Note: <kbd className="px-1 bg-surface-900 border border-surface-600 rounded font-mono text-xs">Escape</kbd> always exits the game, and <kbd className="px-1 bg-surface-900 border border-surface-600 rounded font-mono text-xs">P</kbd> toggles pause.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">Gamepad Controls</h3>
        <div className="bg-surface-800 rounded-lg p-4">
          <p className="text-surface-400 text-sm mb-3">
            During gameplay, press the <strong>Select</strong> button on your gamepad to open the in-game menu with options for save/load states, screenshots, and more.
          </p>
          <p className="text-surface-500 text-xs">
            Note: The Start button passes through to the emulated game for compatibility.
            Controller mapping is handled by EmulatorJS and can be customized via the gamepad icon in the emulator toolbar.
          </p>
        </div>
      </section>
    </div>
  )
}
