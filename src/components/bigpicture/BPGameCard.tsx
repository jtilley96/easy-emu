import { forwardRef, useEffect, useRef } from 'react'
import { Star, Play } from 'lucide-react'
import { Game } from '../../types'
import { useInputStore } from '../../store/inputStore'
import { pathToLocalImageUrl } from '../../utils/image'

interface BPGameCardProps {
  game: Game
  isFocused: boolean
  onSelect: () => void
  onFavorite?: () => void
}

// Card sizes based on settings
const CARD_SIZES = {
  small: { width: 160, height: 224 },
  medium: { width: 200, height: 280 },
  large: { width: 240, height: 336 }
}

const BPGameCard = forwardRef<HTMLButtonElement, BPGameCardProps>(
  function BPGameCard({ game, isFocused, onSelect, onFavorite }, ref) {
    const { bigPictureCardSize } = useInputStore()
    const innerRef = useRef<HTMLButtonElement>(null)
    const cardRef = ref || innerRef

    const size = CARD_SIZES[bigPictureCardSize]

    // Scroll into view when focused
    useEffect(() => {
      if (isFocused && typeof cardRef !== 'function' && cardRef.current) {
        cardRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        })
      }
    }, [isFocused, cardRef])

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect()
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        onFavorite?.()
      }
    }

    return (
      <button
        ref={cardRef as React.RefObject<HTMLButtonElement>}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className={`bp-game-card relative rounded-xl overflow-hidden text-left transition-all duration-200 outline-none ${
          isFocused
            ? 'transform scale-105 shadow-2xl ring-4 ring-accent bp-focus z-10'
            : 'hover:scale-102 shadow-lg'
        }`}
        style={{ width: size.width, height: size.height }}
        tabIndex={0}
        aria-label={`${game.title}${game.isFavorite ? ', favorited' : ''}`}
      >
        {/* Cover Art */}
        <div className="absolute inset-0 bg-surface-800">
          {game.coverPath ? (
            <img
              src={pathToLocalImageUrl(game.coverPath)}
              alt={game.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-700 to-surface-800">
              <span className="text-4xl font-bold text-surface-600">
                {game.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Play icon on focus */}
        {isFocused && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-accent/90 flex items-center justify-center shadow-xl animate-pulse">
              <Play size={32} className="text-white ml-1" />
            </div>
          </div>
        )}

        {/* Favorite badge */}
        {game.isFavorite && (
          <div className="absolute top-3 right-3">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-white truncate text-sm drop-shadow-lg">
            {game.title}
          </h3>
          {game.platform && (
            <p className="text-xs text-surface-300 truncate drop-shadow">
              {game.platform}
            </p>
          )}
        </div>
      </button>
    )
  }
)

export default BPGameCard
