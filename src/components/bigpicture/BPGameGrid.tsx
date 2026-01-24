import { useState, useEffect, useCallback, useRef } from 'react'
import { Game } from '../../types'
import { useInputStore } from '../../store/inputStore'
import { useGamepadNavigation, NavigationDirection } from '../../hooks/useGamepadNavigation'
import BPGameCard from './BPGameCard'

interface BPGameGridProps {
  games: Game[]
  enabled?: boolean
  onSelectGame: (game: Game) => void
  onFavoriteGame?: (game: Game) => void
  onBack?: () => void
}

// Calculate columns based on card size
const COLUMNS_BY_SIZE = {
  small: 7,
  medium: 6,
  large: 5
}

// Card sizes to calculate minimum column width
const CARD_SIZES = {
  small: { width: 160 },
  medium: { width: 200 },
  large: { width: 240 }
}

export default function BPGameGrid({
  games,
  enabled = true,
  onSelectGame,
  onFavoriteGame,
  onBack
}: BPGameGridProps) {
  const { bigPictureCardSize } = useInputStore()
  const [focusedIndex, setFocusedIndex] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)

  const columns = COLUMNS_BY_SIZE[bigPictureCardSize]
  const cardWidth = CARD_SIZES[bigPictureCardSize].width
  // Add small buffer for scale effect (5% scale = ~8-12px depending on card size)
  const minColumnWidth = cardWidth + 12

  // Reset focus when games change
  useEffect(() => {
    setFocusedIndex(0)
  }, [games])

  // Handle navigation
  const handleNavigate = useCallback((direction: NavigationDirection) => {
    const totalGames = games.length
    if (totalGames === 0) return

    setFocusedIndex(current => {
      let newIndex = current

      switch (direction) {
        case 'left':
          // Move left, wrap to end of previous row if at start
          if (current % columns === 0) {
            // At start of row - wrap to end of previous row
            newIndex = current > 0 ? current - 1 : totalGames - 1
          } else {
            newIndex = current - 1
          }
          break

        case 'right':
          // Move right, wrap to start of next row if at end
          if ((current + 1) % columns === 0 || current === totalGames - 1) {
            // At end of row or last item - wrap to start of next row
            newIndex = current < totalGames - 1 ? current + 1 : 0
          } else {
            newIndex = current + 1
          }
          break

        case 'up':
          // Move up one row
          if (current - columns >= 0) {
            newIndex = current - columns
          } else {
            // At top row - exit to parent (filters)
            onBack?.()
            return current  // Don't change index
          }
          break

        case 'down':
          // Move down one row
          if (current + columns < totalGames) {
            newIndex = current + columns
          } else {
            // At bottom row - wrap to top
            const targetCol = current % columns
            newIndex = Math.min(targetCol, totalGames - 1)
          }
          break
      }

      return Math.max(0, Math.min(newIndex, totalGames - 1))
    })
  }, [games.length, columns])

  const handleConfirm = useCallback(() => {
    if (games[focusedIndex]) {
      onSelectGame(games[focusedIndex])
    }
  }, [focusedIndex, games, onSelectGame])

  const handleOption2 = useCallback(() => {
    // Y button for favorite
    if (games[focusedIndex] && onFavoriteGame) {
      onFavoriteGame(games[focusedIndex])
    }
  }, [focusedIndex, games, onFavoriteGame])

  // Gamepad navigation
  useGamepadNavigation({
    enabled,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack,
    onOption2: handleOption2
  })

  // Keyboard navigation
  useEffect(() => {
    if (!enabled) return

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
        case 'ArrowLeft':
          e.preventDefault()
          handleNavigate('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNavigate('right')
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleConfirm()
          break
        case 'Escape':
          e.preventDefault()
          onBack?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleNavigate, handleConfirm, onBack])

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-2xl text-surface-400 mb-2">No games found</p>
          <p className="text-surface-500">Add some ROMs to your library</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={gridRef}
      className="grid gap-4 p-8 overflow-auto h-full"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(${minColumnWidth}px, 1fr))`,
        justifyItems: 'center'
      }}
    >
      {games.map((game, index) => (
        <BPGameCard
          key={game.id}
          game={game}
          isFocused={enabled && index === focusedIndex}
          onSelect={() => onSelectGame(game)}
          onFavorite={onFavoriteGame ? () => onFavoriteGame(game) : undefined}
        />
      ))}
    </div>
  )
}
