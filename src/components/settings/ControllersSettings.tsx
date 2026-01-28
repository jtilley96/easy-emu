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

const GRID_COLS = 2
const GRID_ROWS = Math.ceil(FUNCTION_KEYS.length / GRID_COLS) // 6 rows of keys
const TOTAL_ROWS = GRID_ROWS + 1 // +1 for reset button

export default function ControllersSettings({
  isFocused,
  focusedRow,
  focusedCol,
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

  // Grid: 6 rows of 2 F-keys + 1 row for reset button
  useEffect(() => {
    const cols = Array(GRID_ROWS).fill(GRID_COLS) as number[]
    cols.push(1) // reset button row
    onGridChange({ rows: TOTAL_ROWS, cols })
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

  // Map grid position to function key index
  const getKeyIndex = (row: number, col: number) => row * GRID_COLS + col
  const getKeyFromGrid = (row: number, col: number) => FUNCTION_KEYS[getKeyIndex(row, col)]

  // Helper to check if a specific cell is focused
  const isCellFocused = (row: number, col: number) =>
    isFocused && focusedRow === row && focusedCol === col && !isDropdownOpen

  const isResetFocused = isFocused && focusedRow === GRID_ROWS && !isDropdownOpen

  // Handle gamepad confirmation
  const handleConfirm = useCallback(() => {
    if (justActivatedRef.current) return

    if (isDropdownOpen) {
      confirmDropdownSelection()
      return
    }

    // Reset button row
    if (focusedRow === GRID_ROWS) {
      handleResetDefaults()
      return
    }

    const key = getKeyFromGrid(focusedRow, focusedCol)
    if (key) {
      openDropdown(key)
    }
  }, [focusedRow, focusedCol, isDropdownOpen, confirmDropdownSelection, openDropdown, justActivatedRef])

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
        if (focusedRow > 0) {
          onFocusChange(focusedRow - 1, Math.min(focusedCol, focusedRow - 1 < GRID_ROWS ? GRID_COLS - 1 : 0))
        }
      } else if (direction === 'down') {
        if (focusedRow < TOTAL_ROWS - 1) {
          onFocusChange(focusedRow + 1, Math.min(focusedCol, focusedRow + 1 < GRID_ROWS ? GRID_COLS - 1 : 0))
        }
      } else if (direction === 'left') {
        if (focusedCol > 0) {
          onFocusChange(focusedRow, focusedCol - 1)
        } else {
          onBack()
        }
      } else if (direction === 'right') {
        const maxCol = focusedRow < GRID_ROWS ? GRID_COLS - 1 : 0
        if (focusedCol < maxCol) {
          onFocusChange(focusedRow, focusedCol + 1)
        }
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
      <h2 className="text-2xl font-bold mb-6">Hotkeys</h2>

      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Keyboard size={20} className="text-accent" />
          <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
        </div>
        <p className="text-surface-400 text-sm mb-4">
          Configure keyboard shortcuts (F1-F12) for emulator actions during gameplay.
          Click any key to change its action.
        </p>

        <div className="bg-surface-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {FUNCTION_KEYS.map((key, index) => {
              const gridRow = Math.floor(index / GRID_COLS)
              const gridCol = index % GRID_COLS
              const currentAction = hotkeys[key] || 'none'
              const currentOption = HOTKEY_OPTIONS.find(o => o.value === currentAction)
              const focused = isCellFocused(gridRow, gridCol)
              const isThisDropdownOpen = openDropdownKey === key

              return (
                <div key={key} className="relative">
                  <div
                    data-focus-row={gridRow}
                    data-focus-col={gridCol}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all ${
                      focused ? 'bg-surface-700 ring-2 ring-accent' : 'hover:bg-surface-700'
                    }`}
                    onClick={() => openDropdown(key)}
                  >
                    <kbd className="px-2 py-0.5 bg-surface-900 border border-surface-600 rounded font-mono text-xs min-w-[40px] text-center">
                      {key}
                    </kbd>
                    <span className={`${currentAction === 'none' ? 'text-surface-500' : 'text-surface-300'}`}>
                      {currentOption?.label || 'None'}
                    </span>
                  </div>

                  {isThisDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface-900 border border-accent rounded overflow-hidden shadow-xl">
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
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-surface-500 text-xs">
              <kbd className="px-1 bg-surface-900 border border-surface-600 rounded font-mono text-xs">Escape</kbd> always exits the game. <kbd className="px-1 bg-surface-900 border border-surface-600 rounded font-mono text-xs">P</kbd> toggles pause.
            </p>
            <button
              data-focus-row={GRID_ROWS}
              data-focus-col={0}
              onClick={handleResetDefaults}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                isResetFocused ? 'bg-surface-600 ring-2 ring-accent' : 'bg-surface-700 hover:bg-surface-600'
              }`}
            >
              Reset to Defaults
            </button>
          </div>
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
