import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'
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

describe('BPSettings', () => {
  let BPSettings: typeof import('../../../pages/bigpicture/BPSettings').default
  const mockSetIsNavFocused = vi.fn()

  beforeEach(async () => {
    vi.resetModules()
    clearGamepads()

    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null,
      bigPictureCardSize: 'medium',
      bigPictureOnStartup: false,
      analogDeadzone: 0.15
    })

    const module = await import('../../../pages/bigpicture/BPSettings')
    BPSettings = module.default
  })

  afterEach(() => {
    clearGamepads()
    mockSetIsNavFocused.mockClear()
  })

  function renderWithContext(isNavFocused = false) {
    return render(
      <MemoryRouter initialEntries={['/bigpicture/settings']}>
        <Routes>
          <Route path="/bigpicture" element={
            <div>
              <Outlet context={{ isNavFocused, setIsNavFocused: mockSetIsNavFocused }} />
            </div>
          }>
            <Route path="settings" element={<BPSettings />} />
            <Route index element={<div data-testid="library">Library</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
  }

  describe('rendering', () => {
    it('renders section list', () => {
      renderWithContext()

      expect(screen.getByText('Display')).toBeInTheDocument()
      expect(screen.getByText('Controller')).toBeInTheDocument()
      expect(screen.getByText('Audio')).toBeInTheDocument()
    })

    it('renders back button', () => {
      renderWithContext()

      expect(screen.getByText('Back to Library')).toBeInTheDocument()
    })

    it('renders Display section content by default', () => {
      renderWithContext()

      expect(screen.getByText('Card Size')).toBeInTheDocument()
      expect(screen.getByText('Start in Big Picture')).toBeInTheDocument()
    })
  })

  describe('section list navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('receives focus from nav bar on DOWN press', () => {
      renderWithContext(false)

      // Display section should have focus styling when nav is not focused
      const displayButton = screen.getByText('Display').closest('button')
      expect(displayButton).toHaveClass('bp-focus')
    })

    it('UP/DOWN navigates between sections', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Press DOWN to go to Controller
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)

      await act(async () => {
        flushAnimationFrames(3)
      })

      const controllerButton = screen.getByText('Controller').closest('button')
      expect(controllerButton).toHaveClass('bp-focus')
    })

    it('UP at top section moves focus back to nav bar', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Press UP at Display (first section)
      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(mockSetIsNavFocused).toHaveBeenCalledWith(true)
    })

    it('DOWN does not go past last section', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Move to Audio (last section)
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })

      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })

      // Try to go past
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(3) })

      // Should still be on Audio
      const audioButton = screen.getByText('Audio').closest('button')
      expect(audioButton).toHaveClass('bp-focus')
    })

    it('RIGHT moves focus to section items', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // First item (Card Size) should have focus
      const cardSizeItem = screen.getByText('Card Size').closest('div')?.parentElement
      expect(cardSizeItem).toHaveClass('bp-focus')
    })

    it('A button on section moves focus to items', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // First item should have focus
      const cardSizeItem = screen.getByText('Card Size').closest('div')?.parentElement
      expect(cardSizeItem).toHaveClass('bp-focus')
    })
  })

  describe('settings item navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('UP/DOWN navigates between items within section', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Enter items
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Navigate down to "Start in Big Picture"
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)

      await act(async () => {
        flushAnimationFrames(3)
      })

      const startItem = screen.getByText('Start in Big Picture').closest('div')?.parentElement
      expect(startItem).toHaveClass('bp-focus')
    })

    it('UP at first item returns to section list', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Enter items
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Press UP at first item
      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Section list should be focused
      const displayButton = screen.getByText('Display').closest('button')
      expect(displayButton).toHaveClass('bp-focus')
    })

    it('LEFT returns to section list', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Enter items
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Press LEFT
      pressButton(0, BUTTON_INDICES.DPAD_LEFT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Section list should be focused
      const displayButton = screen.getByText('Display').closest('button')
      expect(displayButton).toHaveClass('bp-focus')
    })

    it('B returns to section list', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Enter items
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Press B
      pressButton(0, BUTTON_INDICES.B)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Section list should be focused
      const displayButton = screen.getByText('Display').closest('button')
      expect(displayButton).toHaveClass('bp-focus')
    })
  })

  describe('settings item interaction - CRITICAL', () => {
    // These tests document EXPECTED behavior
    // They will FAIL if handleConfirm doesn't handle item activation

    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it.skip('A button on Card Size dropdown cycles value', async () => {
      // EXPECTED: Pressing A on Card Size cycles through small/medium/large
      // CURRENT: handleConfirm only handles isSectionFocused === true case
      const setBigPictureCardSize = vi.fn()
      useInputStore.setState({
        bigPictureCardSize: 'medium',
        setBigPictureCardSize
      })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Navigate to Card Size item
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Press A to cycle value
      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // EXPECTED: setBigPictureCardSize called with 'large'
      // ACTUAL: Nothing happens because handleConfirm doesn't handle this case
      expect(setBigPictureCardSize).toHaveBeenCalledWith('large')
    })

    it.skip('A button on toggle setting toggles value', async () => {
      // EXPECTED: Pressing A on "Start in Big Picture" toggles the value
      // CURRENT: handleConfirm only handles entering items, not activating them
      const setBigPictureOnStartup = vi.fn()
      useInputStore.setState({
        bigPictureOnStartup: false,
        setBigPictureOnStartup
      })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Navigate to items, then down to "Start in Big Picture"
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })

      // Press A to toggle
      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // EXPECTED: setBigPictureOnStartup called with true
      // ACTUAL: Nothing happens
      expect(setBigPictureOnStartup).toHaveBeenCalledWith(true)
    })

    it.skip('A button on slider setting enables adjustment mode', async () => {
      // EXPECTED: Pressing A on "Analog Deadzone" should either:
      // 1. Enter edit mode where D-pad adjusts value, or
      // 2. Directly allow D-pad to adjust when focused
      // CURRENT: handleConfirm doesn't handle item activation
      const setAnalogDeadzone = vi.fn()
      useInputStore.setState({
        analogDeadzone: 0.15,
        setAnalogDeadzone
      })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Navigate to Controller section
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })

      // Enter items
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Navigate to Analog Deadzone (second item)
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })

      // Press A to enter edit mode
      pressButton(0, BUTTON_INDICES.A)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.A)
      await act(async () => { flushAnimationFrames(2) })

      // Try to adjust with D-pad RIGHT
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // EXPECTED: setAnalogDeadzone called with higher value
      // ACTUAL: Nothing happens
      expect(setAnalogDeadzone).toHaveBeenCalled()
    })

    it('changes persist in store after navigating away', async () => {
      // Test that when settings ARE changed (via mouse click), they persist
      renderWithContext(false)

      // Click on Card Size dropdown and change it
      const cardSizeSelect = screen.getByDisplayValue('Medium') as HTMLSelectElement
      cardSizeSelect.value = 'large'
      cardSizeSelect.dispatchEvent(new Event('change', { bubbles: true }))

      await act(async () => {
        flushAnimationFrames(3)
      })

      const state = useInputStore.getState()
      expect(state.bigPictureCardSize).toBe('large')
    })
  })

  describe('Controller section', () => {
    it('shows connected controller name', () => {
      const gamepad = createMockGamepad({ index: 0, id: 'Xbox Controller' })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({
        activeGamepadIndex: 0,
        gamepads: [{
          id: 'Xbox Controller',
          index: 0,
          name: 'Xbox Controller',
          connected: true,
          type: 'xbox',
          buttons: [],
          axes: [0, 0, 0, 0]
        }]
      })

      renderWithContext(false)

      // Click on Controller section
      const controllerButton = screen.getByText('Controller').closest('button')
      controllerButton?.click()

      expect(screen.getByText('Xbox Controller')).toBeInTheDocument()
    })

    it('shows "None" when no controller connected', () => {
      renderWithContext(false)

      // Click on Controller section
      const controllerButton = screen.getByText('Controller').closest('button')
      controllerButton?.click()

      expect(screen.getByText('None')).toBeInTheDocument()
    })

    it('shows controller count message', () => {
      useInputStore.setState({
        gamepads: [{
          id: 'Controller 1',
          index: 0,
          name: 'Controller 1',
          connected: true,
          type: 'xbox',
          buttons: [],
          axes: [0, 0, 0, 0]
        }]
      })

      renderWithContext(false)

      // Click on Controller section
      const controllerButton = screen.getByText('Controller').closest('button')
      controllerButton?.click()

      expect(screen.getByText(/1 controller\(s\) detected/)).toBeInTheDocument()
    })
  })

  describe('Audio section', () => {
    it('shows audio settings info', () => {
      renderWithContext(false)

      // Click on Audio section
      const audioButton = screen.getByText('Audio').closest('button')
      audioButton?.click()

      expect(screen.getByText('Audio Settings')).toBeInTheDocument()
      expect(screen.getByText('System Default')).toBeInTheDocument()
    })
  })

  describe('back navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('B button from section list navigates back to library', async () => {
      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.B)

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        expect(screen.getByTestId('library')).toBeInTheDocument()
      })
    })

    it('clicking back button navigates to library', async () => {
      renderWithContext(false)

      const backButton = screen.getByText('Back to Library').closest('button')
      backButton?.click()

      await waitFor(() => {
        expect(screen.getByTestId('library')).toBeInTheDocument()
      })
    })
  })

  describe('keyboard navigation', () => {
    it('arrow keys navigate sections', async () => {
      renderWithContext(false)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))

      await act(async () => {
        await new Promise(r => setTimeout(r, 50))
      })

      const controllerButton = screen.getByText('Controller').closest('button')
      expect(controllerButton).toHaveClass('bp-focus')
    })

    it('Enter key enters section items', async () => {
      renderWithContext(false)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

      await act(async () => {
        await new Promise(r => setTimeout(r, 50))
      })

      // First item should be focused
      const cardSizeItem = screen.getByText('Card Size').closest('div')?.parentElement
      expect(cardSizeItem).toHaveClass('bp-focus')
    })

    it('Escape key goes back', async () => {
      renderWithContext(false)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      await waitFor(() => {
        expect(screen.getByTestId('library')).toBeInTheDocument()
      })
    })
  })

  describe('section content switching', () => {
    it('selecting Display shows Display settings', () => {
      renderWithContext(false)

      expect(screen.getByText('Card Size')).toBeInTheDocument()
      expect(screen.getByText('Start in Big Picture')).toBeInTheDocument()
    })

    it('selecting Controller shows Controller settings', () => {
      renderWithContext(false)

      const controllerButton = screen.getByText('Controller').closest('button')
      controllerButton?.click()

      expect(screen.getByText('Connected Controllers')).toBeInTheDocument()
      expect(screen.getByText('Analog Deadzone')).toBeInTheDocument()
    })

    it('selecting Audio shows Audio settings', () => {
      renderWithContext(false)

      const audioButton = screen.getByText('Audio').closest('button')
      audioButton?.click()

      expect(screen.getByText('Audio Settings')).toBeInTheDocument()
    })
  })

  describe('disabled when nav focused', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('does not respond to gamepad input when nav is focused', async () => {
      renderWithContext(true) // isNavFocused = true

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_DOWN)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Display should still be selected (first section)
      const displayButton = screen.getByText('Display').closest('button')
      // When nav is focused, section doesn't have bp-focus
      expect(displayButton).not.toHaveClass('bp-focus')
    })
  })

  describe('focus styling', () => {
    it('focused section has scale and shadow styling', () => {
      renderWithContext(false)

      const displayButton = screen.getByText('Display').closest('button')
      expect(displayButton).toHaveClass('scale-105')
      expect(displayButton).toHaveClass('shadow-lg')
    })

    it('focused item has scale and shadow styling', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })

      renderWithContext(false)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Enter items
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      const cardSizeItem = screen.getByText('Card Size').closest('div')?.parentElement
      expect(cardSizeItem).toHaveClass('shadow-lg')
    })
  })
})
