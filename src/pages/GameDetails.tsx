import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Play,
  ArrowLeft,
  Clock,
  Calendar,
  Folder,
  Star,
  Edit,
  Trash2,
  Settings2
} from 'lucide-react'
import { useLibraryStore } from '../store/libraryStore'
import { useUIStore } from '../store/uiStore'
import { formatPlayTime, formatDate } from '../utils/format'
import { pathToLocalImageUrl } from '../utils/image'
import EditMetadataModal from '../components/EditMetadataModal'
import GameSettingsModal from '../components/GameSettingsModal'
import ScreenshotGallery from '../components/ScreenshotGallery'

export default function GameDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { games, launchGame, toggleFavorite, deleteGame, platformsWithEmulator, loadLibrary } = useLibraryStore()
  const { addToast } = useUIStore()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showGameSettingsModal, setShowGameSettingsModal] = useState(false)
  const [launching, setLaunching] = useState(false)

  const game = games.find(g => g.id === id)
  const canPlay = game ? platformsWithEmulator.includes(game.platform) : false
  const noEmulatorTooltip = game
    ? `No emulator configured for ${game.platform}. Add one in Settings → Emulators.`
    : ''

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

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
    if (!game) return
    setLaunching(true)
    try {
      await launchGame(game.id, game.preferredEmulator || undefined)
    } catch (error) {
      addToast('error', (error as Error)?.message ?? 'Failed to launch game')
    } finally {
      setLaunching(false)
    }
  }

  const handleToggleFavorite = async () => {
    await toggleFavorite(game.id)
    addToast('success', game.isFavorite ? 'Removed from favorites' : 'Added to favorites')
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteGame(game.id)
      addToast('success', 'Game removed from library')
      navigate('/')
    } catch (error) {
      addToast('error', 'Failed to delete game')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="h-full overflow-auto">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-b from-surface-800 to-surface-900 overflow-hidden">
        {game.backdropPath && (
          <img
            src={pathToLocalImageUrl(game.backdropPath)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
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
                  src={pathToLocalImageUrl(game.coverPath)}
                  alt={game.title}
                  className="w-full h-full object-cover object-center"
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
                disabled={launching}
                title={!canPlay ? noEmulatorTooltip : undefined}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-lg ${
                  canPlay ? 'bg-accent hover:bg-accent-hover' : 'bg-amber-600/80 hover:bg-amber-600'
                } disabled:opacity-70`}
              >
                <Play size={24} fill="currentColor" />
                {launching ? 'Launching…' : 'Play'}
              </button>

              <button
                onClick={handleToggleFavorite}
                className={`p-3 rounded-lg ${
                  game.isFavorite
                    ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                    : 'bg-surface-800 hover:bg-surface-700'
                }`}
                title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star size={20} className={game.isFavorite ? 'fill-yellow-500' : ''} />
              </button>

              <button
                onClick={() => setShowEditModal(true)}
                className="p-3 bg-surface-800 hover:bg-surface-700 rounded-lg"
                title="Edit metadata"
              >
                <Edit size={20} />
              </button>

              <button
                onClick={() => setShowGameSettingsModal(true)}
                className="p-3 bg-surface-800 hover:bg-surface-700 rounded-lg"
                title="Game settings (emulator override)"
              >
                <Settings2 size={20} />
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 bg-surface-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg"
                title="Remove from library"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 mb-3">Remove "{game.title}" from your library?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white disabled:opacity-50"
                  >
                    {isDeleting ? 'Removing...' : 'Remove'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

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

            {/* Screenshots */}
            {game.screenshotPaths && game.screenshotPaths.length > 0 && (
              <ScreenshotGallery screenshots={game.screenshotPaths} />
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

      {/* Edit Metadata Modal */}
      {game && (
        <EditMetadataModal
          game={game}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Game Settings Modal */}
      {game && (
        <GameSettingsModal
          game={game}
          isOpen={showGameSettingsModal}
          onClose={() => setShowGameSettingsModal(false)}
        />
      )}
    </div>
  )
}
