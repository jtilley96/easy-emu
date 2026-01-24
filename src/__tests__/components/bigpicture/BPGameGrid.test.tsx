import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { useInputStore } from '../../../store/inputStore'
import { createMockGame } from '../../mocks/electronAPI'
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

// Mock BPGameCard
vi.mock('../../../components/bigpicture/BPGameCard', () => ({
  default: ({ game, isFocused, onSelect, onFavorite }: {
    game: { id: string; title: string }
    isFocused: boolean
    onSelect: () => void
    onFavorite?: () => void
  }) => (
    <div
      data-testid={`game-card-${game.id}`}
      data-focused={isFocused}
      className={isFocused ? 'bp-focus' : ''}
      onClick={onSelect}
    >
      {game.title}
      {onFavorite && (
        <button data-testid={`favorite-${game.id}`} onClick={(e) => { e.stopPropagation(); onFavorite(); }}>
          Favorite
        </button>
      )}
    </div>
  )
}))

describe('BPGameGrid', () => {
  let BPGameGrid: typeof import('../../../components/bigpicture/BPGameGrid').default

  beforeEach(async () => {
    vi.resetModules()
    clearGamepads()

    useInputStore.setState({
      gamepads: [],
      activeGamepadIndex: null,
      bigPictureCardSize: 'medium'
    })

    const module = await import('../../../components/bigpicture/BPGameGrid')
    BPGameGrid = module.default
  })

  afterEach(() => {
    clearGamepads()
  })

  const createGames = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      createMockGame({ id: `game-${i}`, title: `Game ${i}` })
    )

  describe('rendering', () => {
    it('renders game cards', () => {
      const games = createGames(3)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      expect(screen.getByTestId('game-card-game-0')).toBeInTheDocument()
      expect(screen.getByTestId('game-card-game-1')).toBeInTheDocument()
      expect(screen.getByTestId('game-card-game-2')).toBeInTheDocument()
    })

    it('shows empty state when no games', () => {
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={[]} onSelectGame={onSelectGame} />)

      expect(screen.getByText('No games found')).toBeInTheDocument()
    })

    it('first game is focused by default', () => {
      const games = createGames(3)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      expect(screen.getByTestId('game-card-game-0')).toHaveAttribute('data-focused', 'true')
    })
  })

  describe('gamepad navigation', () => {
    beforeEach(async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })
    })

    it('D-pad right moves focus to next game', async () => {
      const games = createGames(6)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(screen.getByTestId('game-card-game-1')).toHaveAttribute('data-focused', 'true')
    })

    it('D-pad left moves focus to previous game', async () => {
      const games = createGames(6)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Move right first
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(2) })

      // Then move left
      pressButton(0, BUTTON_INDICES.DPAD_LEFT)
      await act(async () => { flushAnimationFrames(3) })

      expect(screen.getByTestId('game-card-game-0')).toHaveAttribute('data-focused', 'true')
    })

    it('D-pad down moves focus to next row', async () => {
      // With medium card size, columns = 6
      const games = createGames(12)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_DOWN)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Should move from game-0 to game-6 (one row down)
      expect(screen.getByTestId('game-card-game-6')).toHaveAttribute('data-focused', 'true')
    })

    it('D-pad up moves focus to previous row', async () => {
      const games = createGames(12)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Move down first
      pressButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })
      releaseButton(0, BUTTON_INDICES.DPAD_DOWN)
      await act(async () => { flushAnimationFrames(2) })

      // Then move up
      pressButton(0, BUTTON_INDICES.DPAD_UP)
      await act(async () => { flushAnimationFrames(3) })

      expect(screen.getByTestId('game-card-game-0')).toHaveAttribute('data-focused', 'true')
    })

    it('wraps horizontally to next row', async () => {
      const games = createGames(12)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Move to end of first row (position 5 with 6 columns)
      for (let i = 0; i < 5; i++) {
        pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
        await act(async () => { flushAnimationFrames(2) })
        releaseButton(0, BUTTON_INDICES.DPAD_RIGHT)
        await act(async () => { flushAnimationFrames(2) })
      }

      // Now at position 5, move right one more
      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)
      await act(async () => { flushAnimationFrames(3) })

      // Should wrap to position 6 (start of next row)
      expect(screen.getByTestId('game-card-game-6')).toHaveAttribute('data-focused', 'true')
    })

    it('UP at top row calls onBack', async () => {
      const games = createGames(6)
      const onSelectGame = vi.fn()
      const onBack = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} onBack={onBack} />)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_UP)

      await act(async () => {
        flushAnimationFrames(3)
      })

      await waitFor(() => {
        expect(onBack).toHaveBeenCalled()
      })
    })

    it('A button triggers onSelectGame', async () => {
      const games = createGames(3)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.A)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onSelectGame).toHaveBeenCalledWith(games[0])
    })

    it('Y button triggers onFavoriteGame', async () => {
      const games = createGames(3)
      const onSelectGame = vi.fn()
      const onFavoriteGame = vi.fn()

      render(
        <BPGameGrid
          games={games}
          onSelectGame={onSelectGame}
          onFavoriteGame={onFavoriteGame}
        />
      )

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.Y)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onFavoriteGame).toHaveBeenCalledWith(games[0])
    })

    it('B button triggers onBack', async () => {
      const games = createGames(3)
      const onSelectGame = vi.fn()
      const onBack = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} onBack={onBack} />)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.B)

      await act(async () => {
        flushAnimationFrames(3)
      })

      expect(onBack).toHaveBeenCalled()
    })
  })

  describe('focus indicator', () => {
    it('selected item shows focus class', () => {
      const games = createGames(3)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      expect(screen.getByTestId('game-card-game-0')).toHaveClass('bp-focus')
    })

    it('only one item is focused at a time', () => {
      const games = createGames(3)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      const focusedCards = screen.getAllByTestId(/game-card-/).filter(
        card => card.getAttribute('data-focused') === 'true'
      )

      expect(focusedCards).toHaveLength(1)
    })
  })

  describe('disabled state', () => {
    it('does not respond to navigation when disabled', async () => {
      const gamepad = createMockGamepad({ index: 0 })
      setGamepad(0, gamepad)
      fireGamepadConnected(gamepad)
      useInputStore.setState({ activeGamepadIndex: 0 })

      const games = createGames(3)
      const onSelectGame = vi.fn()

      render(<BPGameGrid games={games} onSelectGame={onSelectGame} enabled={false} />)

      await act(async () => {
        flushAnimationFrames(3)
      })

      pressButton(0, BUTTON_INDICES.DPAD_RIGHT)

      await act(async () => {
        flushAnimationFrames(3)
      })

      // Should still be on first item since disabled
      // Focus attribute should be false when disabled
      expect(screen.getByTestId('game-card-game-0')).toHaveAttribute('data-focused', 'false')
    })
  })

  describe('card size', () => {
    it('adjusts columns based on bigPictureCardSize setting', () => {
      useInputStore.setState({ bigPictureCardSize: 'small' })

      const games = createGames(10)
      const onSelectGame = vi.fn()

      const { container } = render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      // Small size = 7 columns
      const grid = container.querySelector('.grid')
      expect(grid).toHaveStyle({ gridTemplateColumns: expect.stringContaining('7') })
    })
  })

  describe('games change', () => {
    it('resets focus to first item when games change', () => {
      const games = createGames(3)
      const onSelectGame = vi.fn()

      const { rerender } = render(<BPGameGrid games={games} onSelectGame={onSelectGame} />)

      // Change games
      const newGames = createGames(5).map((g, i) => ({ ...g, id: `new-${i}` }))
      rerender(<BPGameGrid games={newGames} onSelectGame={onSelectGame} />)

      // First new game should be focused
      expect(screen.getByTestId('game-card-new-0')).toHaveAttribute('data-focused', 'true')
    })
  })
})
