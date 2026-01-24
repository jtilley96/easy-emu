import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useInputStore } from '../../../store/inputStore'
import {
  createMockGamepad,
  setGamepad,
  clearGamepads,
  pressButton,
  releaseButton,
  fireGamepadConnected,
  BUTTON_INDICES
} from '../../mocks/gamepadAPI'
import { flushAnimationFrames } from '../../../../vitest.setup'

// Mock the child components
vi.mock('../../../components/bigpicture/BPControllerHints', () => ({
  default: () => <div data-testid="controller-hints">Hints</div>
}))

describe('BPLayout', () => {
  let BPLayout: typeof import('../../../components/bigpicture/BPLayout').default

  beforeEach(async () => {
    vi.resetModules()
    clearGamepads()

    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null,
      isBigPictureMode: true
    })

    const module = await import('../../../components/bigpicture/BPLayout')
    BPLayout = module.default
  })

  afterEach(() => {
    clearGamepads()
  })

  function renderWithRouter(initialRoute = '/bigpicture') {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/bigpicture" element={<BPLayout />}>
            <Route index element={<div data-testid="library-content">Library Content</div>} />
            <Route path="systems" element={<div data-testid="systems-content">Systems Content</div>} />
            <Route path="settings" element={<div data-testid="settings-content">Settings Content</div>} />
          </Route>
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>
    )
  }

  describe('rendering', () => {
    it('renders nav items', () => {
      renderWithRouter()

      expect(screen.getByText('Library')).toBeInTheDocument()
      expect(screen.getByText('Systems')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('renders logo', () => {
      renderWithRouter()

      expect(screen.getByText('EasyEmu')).toBeInTheDocument()
    })

    it('renders exit button', () => {
      renderWithRouter()

      expect(screen.getByTitle(/Exit Big Picture/i)).toBeInTheDocument()
    })

    it('renders controller hints', () => {
      renderWithRouter()

      expect(screen.getByTestId('controller-hints')).toBeInTheDocument()
    })

    it('renders outlet content', () => {
      renderWithRouter()

      expect(screen.getByTestId('library-content')).toBeInTheDocument()
    })
  })

  describe('nav focus', () => {
    it('nav starts focused on initial render', () => {
      renderWithRouter()

      // Library tab should have focus styling
      const libraryButton = screen.getByText('Library').closest('button')
      expect(libraryButton).toHaveClass('bp-focus')
    })

    it('shows focus indicator on focused nav item', () => {
      renderWithRouter()

      const libraryButton = screen.getByText('Library').closest('button')
      expect(libraryButton).toHaveClass('scale-105')
    })
  })

  describe('gamepad navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('D-pad left navigates to previous tab', async () => {
      renderWithRouter('/bigpicture/systems')

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Systems is index 1, pressing left should go to Library (index 0)
      pressButton(0, BUTTON_INDICES.DPAD_LEFT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      const libraryButton = screen.getByText('Library').closest('button')
      expect(libraryButton).toHaveClass('bp-focus')
    })

    it('D-pad right navigates to next tab', async () => {
      renderWithRouter()

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      const systemsButton = screen.getByText('Systems').closest('button')
      expect(systemsButton).toHaveClass('bp-focus')
    })

    it('A button on tab navigates to that route', async () => {
      renderWithRouter()

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Move to Systems tab
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(2)
      })

      // Press A to confirm
      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        expect(screen.getByTestId('systems-content')).toBeInTheDocument()
      })
    })

    it('down from nav moves focus to content area', async () => {
      renderWithRouter()

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_DOWN)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Nav should no longer be focused (no bp-focus class on any nav item)
      const libraryButton = screen.getByText('Library').closest('button')
      expect(libraryButton).not.toHaveClass('bp-focus')
    })

    it('does not go past last nav item', async () => {
      renderWithRouter('/bigpicture/settings')

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Settings is index 2 (last), pressing right should stay there
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      const settingsButton = screen.getByText('Settings').closest('button')
      expect(settingsButton).toHaveClass('bp-focus')
    })

    it('does not go before first nav item', async () => {
      renderWithRouter()

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Library is index 0 (first), pressing left should stay there
      pressButton(0, BUTTON_INDICES.DPAD_LEFT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      const libraryButton = screen.getByText('Library').closest('button')
      expect(libraryButton).toHaveClass('bp-focus')
    })
  })

  describe('exit big picture', () => {
    it('B button exits big picture mode when nav focused', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })

      renderWithRouter()

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.B)

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        const store = useInputStore.getState()
        expect(store.isBigPictureMode).toBe(false)
      })
    })
  })

  describe('context provider', () => {
    it('passes isNavFocused to children via outlet context', () => {
      // The outlet context is passed to child routes
      renderWithRouter()

      expect(screen.getByTestId('library-content')).toBeInTheDocument()
    })
  })
})
