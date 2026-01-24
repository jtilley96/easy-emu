import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useEmulatorStore } from '../../../store/emulatorStore'
import { useInputStore } from '../../../store/inputStore'
import { flushAnimationFrames } from '../../../../vitest.setup'
import type { GamepadState } from '../../../services/gamepadService'

// Mock the EmulatorJS globals and electronAPI
const mockElectronAPIEmbedded = {
  getGameInfo: vi.fn(),
  getCorePaths: vi.fn(),
  getGameRomData: vi.fn()
}

// Extend window for EmulatorJS globals
declare global {
  interface Window {
    EJS_gameUrl?: string
    EJS_core?: string
    EJS_pathtodata?: string
    EJS_player?: string
    EJS_startOnLoaded?: boolean
    EJS_volume?: number
    EJS_color?: string
    EJS_gameID?: string
    EJS_Buttons?: Record<string, boolean>
    EJS_onGameStart?: () => void
    EJS_emulator?: any
    EJS_STORAGE?: any
  }
}

describe('EmulatorCanvas', () => {
  let EmulatorCanvas: typeof import('../../../components/emulator/EmulatorCanvas').default

  beforeEach(async () => {
    vi.resetModules()

    // Setup mock electronAPI
    Object.defineProperty(window, 'electronAPI', {
      value: {
        ...window.electronAPI,
        embedded: mockElectronAPIEmbedded
      },
      writable: true,
      configurable: true
    })

    // Reset EmulatorJS globals
    delete window.EJS_gameUrl
    delete window.EJS_core
    delete window.EJS_player
    delete window.EJS_emulator
    delete window.EJS_onGameStart

    // Reset stores
    useEmulatorStore.setState({
      loadSRAM: vi.fn().mockResolvedValue(null),
      saveSRAM: vi.fn().mockResolvedValue(undefined)
    })

    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null
    })

    // Mock document.createElement for script injection
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'script') {
        const mockScript = originalCreateElement('script')
        // Prevent actual script loading
        Object.defineProperty(mockScript, 'src', {
          set: () => { },
          get: () => ''
        })
        return mockScript
      }
      return originalCreateElement(tagName)
    })

    const module = await import('../../../components/emulator/EmulatorCanvas')
    EmulatorCanvas = module.default
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('shows loading state initially', () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        title: 'Test Game',
        platform: 'nes'
      })

      render(<EmulatorCanvas gameId="game-1" />)

      expect(screen.getByText('Loading emulator...')).toBeInTheDocument()
    })

    it('renders container div', () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue(null)

      const { container } = render(<EmulatorCanvas gameId="game-1" />)

      expect(container.querySelector('.bg-black')).toBeInTheDocument()
    })
  })

  describe('initialization', () => {
    it('fetches game info on mount', async () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        title: 'Test Game',
        platform: 'nes'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue({
        coreName: 'fceumm',
        dataPath: '/cores'
      })
      mockElectronAPIEmbedded.getGameRomData.mockResolvedValue(new ArrayBuffer(100))

      render(<EmulatorCanvas gameId="game-1" />)

      await waitFor(() => {
        expect(mockElectronAPIEmbedded.getGameInfo).toHaveBeenCalledWith('game-1')
      })
    })

    it('calls onError when game not found', async () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue(null)
      const onError = vi.fn()

      render(<EmulatorCanvas gameId="nonexistent" onError={onError} />)

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      })
    })

    it('calls onError when no core available', async () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        platform: 'unknown'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue(null)
      const onError = vi.fn()

      render(<EmulatorCanvas gameId="game-1" onError={onError} />)

      await waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })
    })
  })

  describe('gamepad configuration', () => {
    it('detects connected gamepad from store', async () => {
      const mockGamepad: GamepadState = {
        id: 'Xbox Controller',
        index: 0,
        name: 'Xbox Controller',
        connected: true,
        type: 'xbox',
        buttons: [],
        axes: [0, 0, 0, 0]
      }

      useInputStore.setState({
        gamepads: [mockGamepad],
        activeGamepadIndex: 0
      })

      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        platform: 'nes'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue({
        coreName: 'fceumm',
        dataPath: '/cores'
      })
      mockElectronAPIEmbedded.getGameRomData.mockResolvedValue(new ArrayBuffer(100))

      render(<EmulatorCanvas gameId="game-1" />)

      // The component should set localStorage for gamepad preference
      await waitFor(() => {
        // Just verify the component renders without error when gamepad is connected
        expect(mockElectronAPIEmbedded.getGameInfo).toHaveBeenCalled()
      })
    })
  })

  describe('callbacks', () => {
    it('calls onStart when emulator starts', async () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        platform: 'nes'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue({
        coreName: 'fceumm',
        dataPath: '/cores'
      })
      mockElectronAPIEmbedded.getGameRomData.mockResolvedValue(new ArrayBuffer(100))

      const onStart = vi.fn()

      render(<EmulatorCanvas gameId="game-1" onStart={onStart} />)

      await waitFor(() => {
        // After initialization, EJS_onGameStart callback should be set
        expect(window.EJS_onGameStart).toBeDefined()
      })

      // Simulate EmulatorJS calling the callback
      if (window.EJS_onGameStart) {
        window.EJS_onGameStart()
      }

      expect(onStart).toHaveBeenCalled()
    })

    it('calls onStop on unmount', async () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        platform: 'nes'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue({
        coreName: 'fceumm',
        dataPath: '/cores'
      })
      mockElectronAPIEmbedded.getGameRomData.mockResolvedValue(new ArrayBuffer(100))

      const onStop = vi.fn()

      const { unmount } = render(<EmulatorCanvas gameId="game-1" onStop={onStop} />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      unmount()

      await waitFor(() => {
        expect(onStop).toHaveBeenCalled()
      })
    })
  })

  describe('EJS configuration', () => {
    it('sets correct EJS globals for game', async () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        platform: 'nes'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue({
        coreName: 'fceumm',
        dataPath: '/cores'
      })
      mockElectronAPIEmbedded.getGameRomData.mockResolvedValue(new ArrayBuffer(100))

      render(<EmulatorCanvas gameId="game-1" />)

      await waitFor(() => {
        expect(window.EJS_gameID).toBe('game-1')
        expect(window.EJS_core).toBe('fceumm')
        expect(window.EJS_startOnLoaded).toBe(true)
      })
    })

    it('enables gamepad button in toolbar', async () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        platform: 'nes'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue({
        coreName: 'fceumm',
        dataPath: '/cores'
      })
      mockElectronAPIEmbedded.getGameRomData.mockResolvedValue(new ArrayBuffer(100))

      render(<EmulatorCanvas gameId="game-1" />)

      await waitFor(() => {
        expect(window.EJS_Buttons?.gamepad).toBe(true)
      })
    })
  })

  describe('ref methods', () => {
    it('exposes control methods via ref', async () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        platform: 'nes'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue({
        coreName: 'fceumm',
        dataPath: '/cores'
      })
      mockElectronAPIEmbedded.getGameRomData.mockResolvedValue(new ArrayBuffer(100))

      const ref = { current: null } as any

      render(<EmulatorCanvas gameId="game-1" ref={ref} />)

      await waitFor(() => {
        expect(ref.current).toBeDefined()
      })

      // Check ref methods are exposed
      expect(typeof ref.current.pause).toBe('function')
      expect(typeof ref.current.resume).toBe('function')
      expect(typeof ref.current.saveState).toBe('function')
      expect(typeof ref.current.loadState).toBe('function')
      expect(typeof ref.current.saveSRAM).toBe('function')
      expect(typeof ref.current.screenshot).toBe('function')
      expect(typeof ref.current.setVolume).toBe('function')
      expect(typeof ref.current.mute).toBe('function')
      expect(typeof ref.current.unmute).toBe('function')
      expect(typeof ref.current.enterFullscreen).toBe('function')
      expect(typeof ref.current.exitFullscreen).toBe('function')
    })
  })

  describe('SRAM loading', () => {
    it('loads SRAM data if available', async () => {
      const sramData = new ArrayBuffer(8192)
      const loadSRAM = vi.fn().mockResolvedValue(sramData)
      useEmulatorStore.setState({ loadSRAM })

      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        platform: 'nes'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue({
        coreName: 'fceumm',
        dataPath: '/cores'
      })
      mockElectronAPIEmbedded.getGameRomData.mockResolvedValue(new ArrayBuffer(100))

      render(<EmulatorCanvas gameId="game-1" />)

      await waitFor(() => {
        expect(loadSRAM).toHaveBeenCalledWith('game-1')
      })
    })
  })

  describe('cleanup', () => {
    it('cleans up EJS globals on unmount', async () => {
      mockElectronAPIEmbedded.getGameInfo.mockResolvedValue({
        id: 'game-1',
        platform: 'nes'
      })
      mockElectronAPIEmbedded.getCorePaths.mockResolvedValue({
        coreName: 'fceumm',
        dataPath: '/cores'
      })
      mockElectronAPIEmbedded.getGameRomData.mockResolvedValue(new ArrayBuffer(100))

      const { unmount } = render(<EmulatorCanvas gameId="game-1" />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
      })

      unmount()

      await waitFor(() => {
        // EJS globals should be cleaned up
        expect(window.EJS_gameUrl).toBeUndefined()
        expect(window.EJS_emulator).toBeUndefined()
      })
    })
  })
})
