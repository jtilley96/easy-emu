import { create } from 'zustand'
import { GamepadState, ControllerMapping } from '../services/gamepadService'

interface InputState {
  // Gamepad state
  gamepads: GamepadState[]
  activeGamepadIndex: number | null

  // Controller mappings (keyed by controller ID)
  controllerMappings: Record<string, ControllerMapping>

  // Keyboard shortcuts (action -> key combo string like "ctrl+f")
  keyboardShortcuts: Record<string, string>

  // Big Picture mode
  isBigPictureMode: boolean

  // Gamepad settings
  analogDeadzone: number
  dpadRepeatDelay: number
  dpadRepeatRate: number

  // Big Picture settings
  bigPictureOnStartup: boolean
  bigPictureCardSize: 'small' | 'medium' | 'large'

  // Actions
  setGamepads: (gamepads: GamepadState[]) => void
  setActiveGamepad: (index: number | null) => void
  setBigPictureMode: (enabled: boolean) => void
  toggleBigPictureMode: () => void
  updateMapping: (controllerId: string, mapping: ControllerMapping) => void
  deleteMapping: (controllerId: string) => void
  updateKeyboardShortcut: (action: string, shortcut: string) => void
  setAnalogDeadzone: (value: number) => void
  setDpadRepeatDelay: (value: number) => void
  setDpadRepeatRate: (value: number) => void
  setBigPictureOnStartup: (value: boolean) => void
  setBigPictureCardSize: (size: 'small' | 'medium' | 'large') => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
}

// Default keyboard shortcuts
const DEFAULT_KEYBOARD_SHORTCUTS: Record<string, string> = {
  toggleFullscreen: 'F11',
  focusSearch: 'ctrl+f',
  openSettings: 'ctrl+,',
  toggleBigPicture: 'Tab',
  back: 'Escape',
  pauseGame: 'p',
  saveState: 'F5',
  loadState: 'F8',
  screenshot: 'F12'
}

export const useInputStore = create<InputState>((set, get) => ({
  gamepads: [],
  activeGamepadIndex: null,
  controllerMappings: {},
  keyboardShortcuts: { ...DEFAULT_KEYBOARD_SHORTCUTS },
  isBigPictureMode: false,
  analogDeadzone: 0.15,
  dpadRepeatDelay: 400,
  dpadRepeatRate: 100,
  bigPictureOnStartup: false,
  bigPictureCardSize: 'medium',

  setGamepads: (gamepads) => {
    set({ gamepads })

    // Auto-select first connected gamepad if none is active
    const { activeGamepadIndex } = get()
    if (activeGamepadIndex === null && gamepads.length > 0) {
      set({ activeGamepadIndex: gamepads[0].index })
    } else if (activeGamepadIndex !== null) {
      // Clear active gamepad if it disconnected
      const stillConnected = gamepads.some(g => g.index === activeGamepadIndex)
      if (!stillConnected) {
        set({ activeGamepadIndex: gamepads.length > 0 ? gamepads[0].index : null })
      }
    }
  },

  setActiveGamepad: (index) => {
    set({ activeGamepadIndex: index })
  },

  setBigPictureMode: (enabled) => {
    set({ isBigPictureMode: enabled })
    // Persist to config
    window.electronAPI?.config.set('bigPictureModeEnabled', enabled)
  },

  toggleBigPictureMode: () => {
    const { isBigPictureMode } = get()
    get().setBigPictureMode(!isBigPictureMode)
  },

  updateMapping: (controllerId, mapping) => {
    set(state => ({
      controllerMappings: {
        ...state.controllerMappings,
        [controllerId]: mapping
      }
    }))
    // Save to config
    get().saveSettings()
  },

  deleteMapping: (controllerId) => {
    set(state => {
      const { [controllerId]: _, ...rest } = state.controllerMappings
      return { controllerMappings: rest }
    })
    get().saveSettings()
  },

  updateKeyboardShortcut: (action, shortcut) => {
    set(state => ({
      keyboardShortcuts: {
        ...state.keyboardShortcuts,
        [action]: shortcut
      }
    }))
    get().saveSettings()
  },

  setAnalogDeadzone: (value) => {
    set({ analogDeadzone: value })
    window.electronAPI?.config.set('analogDeadzone', value)
  },

  setDpadRepeatDelay: (value) => {
    set({ dpadRepeatDelay: value })
    window.electronAPI?.config.set('dpadRepeatDelay', value)
  },

  setDpadRepeatRate: (value) => {
    set({ dpadRepeatRate: value })
    window.electronAPI?.config.set('dpadRepeatRate', value)
  },

  setBigPictureOnStartup: (value) => {
    set({ bigPictureOnStartup: value })
    window.electronAPI?.config.set('bigPictureOnStartup', value)
  },

  setBigPictureCardSize: (size) => {
    set({ bigPictureCardSize: size })
    window.electronAPI?.config.set('bigPictureCardSize', size)
  },

  loadSettings: async () => {
    try {
      const config = await window.electronAPI.config.getAll() as Record<string, unknown>

      set({
        controllerMappings: (config.controllerMappings as Record<string, ControllerMapping>) || {},
        keyboardShortcuts: {
          ...DEFAULT_KEYBOARD_SHORTCUTS,
          ...(config.keyboardShortcuts as Record<string, string>) || {}
        },
        isBigPictureMode: config.bigPictureModeEnabled === true,
        analogDeadzone: typeof config.analogDeadzone === 'number' ? config.analogDeadzone : 0.15,
        dpadRepeatDelay: typeof config.dpadRepeatDelay === 'number' ? config.dpadRepeatDelay : 400,
        dpadRepeatRate: typeof config.dpadRepeatRate === 'number' ? config.dpadRepeatRate : 100,
        bigPictureOnStartup: config.bigPictureOnStartup === true,
        bigPictureCardSize: (config.bigPictureCardSize as 'small' | 'medium' | 'large') || 'medium'
      })
    } catch (error) {
      console.error('Failed to load input settings:', error)
    }
  },

  saveSettings: async () => {
    try {
      const state = get()
      await window.electronAPI.config.set('controllerMappings', state.controllerMappings)
      await window.electronAPI.config.set('keyboardShortcuts', state.keyboardShortcuts)
    } catch (error) {
      console.error('Failed to save input settings:', error)
    }
  }
}))

// Action names for display
export const ACTION_LABELS: Record<string, string> = {
  toggleFullscreen: 'Toggle Fullscreen',
  focusSearch: 'Focus Search',
  openSettings: 'Open Settings',
  toggleBigPicture: 'Toggle Big Picture Mode',
  back: 'Back / Close',
  pauseGame: 'Pause Game',
  saveState: 'Save State',
  loadState: 'Load State',
  screenshot: 'Take Screenshot'
}
