import { useParams, useNavigate } from 'react-router-dom'
import {
  Play,
  ArrowLeft,
  Clock,
  Calendar,
  Folder,
  Settings,
  Star,
  Edit,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { useLibraryStore } from '../store/libraryStore'
import { formatPlayTime, formatDate } from '../utils/format'

export default function GameDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { games, launchGame } = useLibraryStore()

  const game = games.find(g => g.id === id)

  if (!game) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-semibold mb-2">Game not found</h2>
        <button
          onClick={() => navigate('/')}
          className="text-accent hover:underline"
        >
          Return to Library
        </button>
      </div>
    )
  }

  const handlePlay = async () => {
    await launchGame(game.id)
  }

  return (
    <div className="h-full overflow-auto">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-b from-surface-800 to-surface-900">
        {game.backdropPath && (
          <img
            src={game.backdropPath}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-surface-900/80 hover:bg-surface-800 rounded-lg backdrop-blur-sm"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      {/* Content */}
      <div className="relative -mt-32 px-8 pb-8">
        <div className="flex gap-8">
          {/* Cover Art */}
          <div className="flex-shrink-0">
            <div className="w-48 h-64 bg-surface-800 rounded-lg overflow-hidden shadow-xl">
              {game.coverPath ? (
                <img
                  src={game.coverPath}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-surface-500">
                  No Cover
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-24">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block px-2 py-1 bg-accent/20 text-accent rounded text-sm mb-2">
                  {game.platform}
                </span>
                <h1 className="text-3xl font-bold mb-2">{game.title}</h1>

                {game.developer && (
                  <p className="text-surface-400 mb-4">{game.developer}</p>
                )}
              </div>

              {game.rating && (
                <div className="flex items-center gap-1 bg-surface-800 px-3 py-2 rounded-lg">
                  <Star size={18} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{game.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handlePlay}
                className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover rounded-lg font-semibold text-lg"
              >
                <Play size={24} fill="currentColor" />
                Play
              </button>

              <button className="p-3 bg-surface-800 hover:bg-surface-700 rounded-lg" title="Game settings">
                <Settings size={20} />
              </button>

              <button className="p-3 bg-surface-800 hover:bg-surface-700 rounded-lg" title="Edit metadata">
                <Edit size={20} />
              </button>

              <button className="p-3 bg-surface-800 hover:bg-surface-700 rounded-lg" title="Re-scrape metadata">
                <RefreshCw size={20} />
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2 text-surface-400">
                <Clock size={16} />
                <span>Play time: {formatPlayTime(game.playTime || 0)}</span>
              </div>

              {game.lastPlayed && (
                <div className="flex items-center gap-2 text-surface-400">
                  <Calendar size={16} />
                  <span>Last played: {formatDate(game.lastPlayed)}</span>
                </div>
              )}

              {game.releaseDate && (
                <div className="flex items-center gap-2 text-surface-400">
                  <Calendar size={16} />
                  <span>Released: {formatDate(game.releaseDate)}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {game.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">About</h3>
                <p className="text-surface-300 leading-relaxed">{game.description}</p>
              </div>
            )}

            {/* Genres */}
            {game.genres && game.genres.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {game.genres.map(genre => (
                    <span
                      key={genre}
                      className="px-3 py-1 bg-surface-800 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* File info */}
            <div className="mt-8 p-4 bg-surface-800/50 rounded-lg">
              <div className="flex items-center gap-2 text-surface-400 text-sm">
                <Folder size={16} />
                <span className="font-mono truncate">{game.path}</span>
                <button
                  onClick={() => window.electronAPI.shell.showItemInFolder(game.path)}
                  className="ml-auto text-accent hover:underline text-sm"
                >
                  Show in folder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
