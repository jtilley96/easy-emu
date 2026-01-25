import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useInputStore } from '../../store/inputStore'
import { getMockElectronAPI } from '../mocks/electronAPI'
import type { GamepadState } from '../../services/gamepadService'

// Helper to create mock GamepadState
function createMockGamepadState(overrides: Partial<GamepadState> = {}): GamepadState {
  return {
    id: 'Xbox 360 Controller',
    index: 0,
    name: 'Xbox Controller',
    connected: true,
    type: 'xbox',
    buttons: [],
    axes: [0, 0, 0, 0],
    ...overrides
  }
}

describe('inputStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null,
      controllerMappings: {},
      keyboardShortcuts: {
        toggleFullscreen: 'F11',
        focusSearch: 'ctrl+f',
        openSettings: 'ctrl+,',
        back: 'Escape',
        pauseGame: 'p',
        saveState: 'F5',
        loadState: 'F8',
        screenshot: 'F12'
      },
      analogDeadzone: 0.15,
      dpadRepeatDelay: 400,
      dpadRepeatRate: 100
    })
  })

  describe('setGamepads', () => {
    it('sets gamepads array', () => {
      const gamepad = createMockGamepadState({ index: 0 })

      useInputStore.getState().setGamepads([gamepad])

      const state = useInputStore.getState()
      expect(state.gamepads).toHaveLength(1)
      expect(state.gamepads[0].index).toBe(0)
    })

    it('auto-selects first gamepad when none is active', () => {
      useInputStore.setState({ activeGamepadIndex: null })

      const gamepad = createMockGamepadState({ index: 2 })
      useInputStore.getState().setGamepads([gamepad])

      const state = useInputStore.getState()
      expect(state.activeGamepadIndex).toBe(2)
    })

    it('does not change active gamepad if still connected', () => {
      useInputStore.setState({ activeGamepadIndex: 1 })

      const gamepads = [
        createMockGamepadState({ index: 0 }),
        createMockGamepadState({ index: 1 })
      ]
      useInputStore.getState().setGamepads(gamepads)

      const state = useInputStore.getState()
      expect(state.activeGamepadIndex).toBe(1)
    })

    it('clears active gamepad if it disconnected', () => {
      useInputStore.setState({ activeGamepadIndex: 1 })

      // Only gamepad 0 is connected now
      const gamepads = [createMockGamepadState({ index: 0 })]
      useInputStore.getState().setGamepads(gamepads)

      const state = useInputStore.getState()
      expect(state.activeGamepadIndex).toBe(0)
    })

    it('sets activeGamepadIndex to null if no gamepads remain', () => {
      useInputStore.setState({ activeGamepadIndex: 0 })

      useInputStore.getState().setGamepads([])

      const state = useInputStore.getState()
      expect(state.activeGamepadIndex).toBeNull()
    })
  })

  describe('setActiveGamepad', () => {
    it('sets active gamepad index', () => {
      useInputStore.getState().setActiveGamepad(2)

      const state = useInputStore.getState()
      expect(state.activeGamepadIndex).toBe(2)
    })

    it('can set to null', () => {
      useInputStore.setState({ activeGamepadIndex: 1 })

      useInputStore.getState().setActiveGamepad(null)

      const state = useInputStore.getState()
      expect(state.activeGamepadIndex).toBeNull()
    })
  })

  describe('setAnalogDeadzone', () => {
    it('sets analog deadzone value', () => {
      useInputStore.getState().setAnalogDeadzone(0.25)

      const state = useInputStore.getState()
      expect(state.analogDeadzone).toBe(0.25)
    })

    it('persists to config', () => {
      const api = getMockElectronAPI()

      useInputStore.getState().setAnalogDeadzone(0.2)

      expect(api.config.set).toHaveBeenCalledWith('analogDeadzone', 0.2)
    })
  })

  describe('setDpadRepeatDelay', () => {
    it('sets D-pad repeat delay', () => {
      useInputStore.getState().setDpadRepeatDelay(500)

      const state = useInputStore.getState()
      expect(state.dpadRepeatDelay).toBe(500)
    })

    it('persists to config', () => {
      const api = getMockElectronAPI()

      useInputStore.getState().setDpadRepeatDelay(300)

      expect(api.config.set).toHaveBeenCalledWith('dpadRepeatDelay', 300)
    })
  })

  describe('setDpadRepeatRate', () => {
    it('sets D-pad repeat rate', () => {
      useInputStore.getState().setDpadRepeatRate(50)

      const state = useInputStore.getState()
      expect(state.dpadRepeatRate).toBe(50)
    })

    it('persists to config', () => {
      const api = getMockElectronAPI()

      useInputStore.getState().setDpadRepeatRate(150)

      expect(api.config.set).toHaveBeenCalledWith('dpadRepeatRate', 150)
    })
  })

  describe('updateMapping', () => {
    it('adds new controller mapping', () => {
      const mapping = {
        id: 'controller-1',
        name: 'My Controller',
        type: 'xbox' as const,
        buttonMappings: { confirm: 0 },
        axisMappings: {}
      }

      useInputStore.getState().updateMapping('controller-1', mapping)

      const state = useInputStore.getState()
      expect(state.controllerMappings['controller-1']).toEqual(mapping)
    })

    it('updates existing controller mapping', () => {
      const originalMapping = {
        id: 'controller-1',
        name: 'Original',
        type: 'xbox' as const,
        buttonMappings: {},
        axisMappings: {}
      }
      useInputStore.setState({ controllerMappings: { 'controller-1': originalMapping } })

      const updatedMapping = { ...originalMapping, name: 'Updated' }
      useInputStore.getState().updateMapping('controller-1', updatedMapping)

      const state = useInputStore.getState()
      expect(state.controllerMappings['controller-1'].name).toBe('Updated')
    })

    it('saves settings after update', async () => {
      const api = getMockElectronAPI()

      const mapping = {
        id: 'controller-1',
        name: 'Test',
        type: 'xbox' as const,
        buttonMappings: {},
        axisMappings: {}
      }

      useInputStore.getState().updateMapping('controller-1', mapping)

      // Give time for async saveSettings
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(api.config.set).toHaveBeenCalledWith('controllerMappings', expect.any(Object))
    })
  })

  describe('deleteMapping', () => {
    it('removes controller mapping', () => {
      const mapping = {
        id: 'controller-1',
        name: 'Test',
        type: 'xbox' as const,
        buttonMappings: {},
        axisMappings: {}
      }
      useInputStore.setState({ controllerMappings: { 'controller-1': mapping } })

      useInputStore.getState().deleteMapping('controller-1')

      const state = useInputStore.getState()
      expect(state.controllerMappings['controller-1']).toBeUndefined()
    })

    it('does not affect other mappings', () => {
      const mappings = {
        'controller-1': {
          id: 'controller-1',
          name: 'Controller 1',
          type: 'xbox' as const,
          buttonMappings: {},
          axisMappings: {}
        },
        'controller-2': {
          id: 'controller-2',
          name: 'Controller 2',
          type: 'playstation' as const,
          buttonMappings: {},
          axisMappings: {}
        }
      }
      useInputStore.setState({ controllerMappings: mappings })

      useInputStore.getState().deleteMapping('controller-1')

      const state = useInputStore.getState()
      expect(state.controllerMappings['controller-2']).toBeDefined()
    })
  })

  describe('updateKeyboardShortcut', () => {
    it('updates keyboard shortcut', () => {
      useInputStore.getState().updateKeyboardShortcut('toggleFullscreen', 'ctrl+Enter')

      const state = useInputStore.getState()
      expect(state.keyboardShortcuts.toggleFullscreen).toBe('ctrl+Enter')
    })

    it('preserves other shortcuts', () => {
      useInputStore.getState().updateKeyboardShortcut('toggleFullscreen', 'ctrl+Enter')

      const state = useInputStore.getState()
      expect(state.keyboardShortcuts.focusSearch).toBe('ctrl+f')
    })
  })

  describe('loadSettings', () => {
    it('loads settings from config', async () => {
      const api = getMockElectronAPI()
      api.config.getAll.mockResolvedValue({
        analogDeadzone: 0.3,
        dpadRepeatDelay: 500,
        dpadRepeatRate: 150
      })

      await useInputStore.getState().loadSettings()

      const state = useInputStore.getState()
      expect(state.analogDeadzone).toBe(0.3)
      expect(state.dpadRepeatDelay).toBe(500)
      expect(state.dpadRepeatRate).toBe(150)
    })

    it('uses defaults for missing values', async () => {
      const api = getMockElectronAPI()
      api.config.getAll.mockResolvedValue({})

      await useInputStore.getState().loadSettings()

      const state = useInputStore.getState()
      expect(state.analogDeadzone).toBe(0.15)
      expect(state.dpadRepeatDelay).toBe(400)
      expect(state.dpadRepeatRate).toBe(100)
    })

    it('merges custom keyboard shortcuts with defaults', async () => {
      const api = getMockElectronAPI()
      api.config.getAll.mockResolvedValue({
        keyboardShortcuts: {
          toggleFullscreen: 'ctrl+Enter'
        }
      })

      await useInputStore.getState().loadSettings()

      const state = useInputStore.getState()
      expect(state.keyboardShortcuts.toggleFullscreen).toBe('ctrl+Enter')
      expect(state.keyboardShortcuts.focusSearch).toBe('ctrl+f')
    })

    it('handles load errors gracefully', async () => {
      const api = getMockElectronAPI()
      api.config.getAll.mockRejectedValue(new Error('Failed to load'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await useInputStore.getState().loadSettings()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load input settings:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('saveSettings', () => {
    it('saves controller mappings to config', async () => {
      const mapping = {
        id: 'controller-1',
        name: 'Test',
        type: 'xbox' as const,
        buttonMappings: {},
        axisMappings: {}
      }
      useInputStore.setState({ controllerMappings: { 'controller-1': mapping } })

      const api = getMockElectronAPI()

      await useInputStore.getState().saveSettings()

      expect(api.config.set).toHaveBeenCalledWith('controllerMappings', { 'controller-1': mapping })
    })

    it('saves keyboard shortcuts to config', async () => {
      const api = getMockElectronAPI()

      await useInputStore.getState().saveSettings()

      expect(api.config.set).toHaveBeenCalledWith('keyboardShortcuts', expect.any(Object))
    })

    it('handles save errors gracefully', async () => {
      const api = getMockElectronAPI()
      api.config.set.mockRejectedValue(new Error('Save failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await useInputStore.getState().saveSettings()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save input settings:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })
})
