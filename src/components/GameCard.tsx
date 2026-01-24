import { Link } from 'react-router-dom'
import { Play, Star, Clock } from 'lucide-react'
import { Game } from '../types'
import { formatPlayTime } from '../utils/format'
import { pathToLocalImageUrl } from '../utils/image'
import { useLibraryStore } from '../store/libraryStore'

interface GameCardProps {
  game: Game
  variant?: 'grid' | 'list'
}

export default function GameCard({ game, variant = 'grid' }: GameCardProps) {
  const { launchGame, toggleFavorite } = useLibraryStore()

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await launchGame(game.id)
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await toggleFavorite(game.id)
  }

  if (variant === 'list') {
    return (
      <Link
        to={`/game/${game.id}`}
        className="flex items-center gap-4 bg-surface-800 hover:bg-surface-700 rounded-lg p-3 transition-colors group"
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 bg-surface-700 rounded overflow-hidden flex-shrink-0">
          {game.coverPath ? (
            <img
              src={pathToLocalImageUrl(game.coverPath)}
              alt={game.title}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-500 text-xs">
              No Cover
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{game.title}</h3>
          <p className="text-sm text-surface-400">{game.platform}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-surface-400">
          {game.playTime && game.playTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatPlayTime(game.playTime)}
            </span>
          )}
          {game.rating && (
            <span className="flex items-center gap-1">
              <Star size={14} className="text-yellow-500" />
              {game.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={handleToggleFavorite}
          className={`p-2 rounded-lg transition-colors ${
            game.isFavorite
              ? 'text-yellow-500'
              : 'text-surface-400 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
          }`}
          title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={18} className={game.isFavorite ? 'fill-yellow-500' : ''} />
        </button>

        {/* Play button */}
        <button
          onClick={handlePlay}
          className="p-3 bg-accent hover:bg-accent-hover rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          title="Play"
        >
          <Play size={18} fill="currentColor" />
        </button>
      </Link>
    )
  }

  // Grid variant
  return (
    <Link
      to={`/game/${game.id}`}
      className="game-card group relative bg-surface-800 rounded-lg overflow-hidden"
    >
      {/* Cover art */}
      <div className="aspect-[3/4] bg-surface-700 relative overflow-hidden">
        {game.coverPath ? (
          <img
            src={pathToLocalImageUrl(game.coverPath)}
            alt={game.title}
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-surface-500">
            <span className="text-xs text-center px-2">{game.title}</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="p-4 bg-accent hover:bg-accent-hover rounded-full transform scale-90 group-hover:scale-100 transition-transform"
            title="Play"
          >
            <Play size={24} fill="currentColor" />
          </button>
        </div>

        {/* Platform badge */}
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-xs font-medium">
          {game.platform}
        </span>

        {/* Favorite button */}
        <button
          onClick={handleToggleFavorite}
          className={`absolute top-2 right-2 p-1 rounded transition-opacity ${
            game.isFavorite
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 hover:bg-black/50'
          }`}
          title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            size={18}
            className={game.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-white'}
          />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate" title={game.title}>
          {game.title}
        </h3>
        {game.playTime && game.playTime > 0 && (
          <p className="text-xs text-surface-400 mt-1">
            {formatPlayTime(game.playTime)} played
          </p>
        )}
      </div>
    </Link>
  )
}
