import { useState, useEffect, useCallback, useRef } from 'react'
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
  Settings2,
  Download,
  Loader2,
  ChevronDown,
  Monitor,
  Gamepad2
} from 'lucide-react'
import { useLibraryStore } from '../store/libraryStore'
import { useEmulatorStore } from '../store/emulatorStore'
import { useUIStore } from '../store/uiStore'
import { formatPlayTime, formatDate } from '../utils/format'
import { pathToLocalImageUrl } from '../utils/image'
import EditMetadataModal from '../components/EditMetadataModal'
import GameSettingsModal from '../components/GameSettingsModal'
import ScreenshotGallery from '../components/ScreenshotGallery'
import { EmbeddedPlayCapability } from '../types'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import { useLayoutContext } from '../components/Layout'

export default function GameDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { games, launchGame, toggleFavorite, deleteGame, platformsWithEmulator, loadLibrary, scrapeGame, isScraping } = useLibraryStore()
  const { checkCanPlayEmbedded, preferEmbedded } = useEmulatorStore()
  const { addToast } = useUIStore()
  const { isSidebarFocused, setIsSidebarFocused } = useLayoutContext()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showGameSettingsModal, setShowGameSettingsModal] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [showPlayMenu, setShowPlayMenu] = useState(false)
  const [playMenuIndex, setPlayMenuIndex] = useState(0) // 0 = embedded, 1 = external
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(0) // 0 = Remove, 1 = Cancel
  const [embeddedCapability, setEmbeddedCapability] = useState<EmbeddedPlayCapability | null>(null)
  const [focusedButton, setFocusedButton] = useState<'play' | 'favorite' | 'scrape' | 'edit' | 'settings' | 'delete' | 'back'>('play')
  
  // Prevent A button from firing immediately after navigation
  const justNavigatedRef = useRef(true)

  const game = games.find(g => g.id === id)
  const canPlayExternal = game ? platformsWithEmulator.includes(game.platform) : false
  const canPlayEmbedded = embeddedCapability?.canPlay ?? false
  const canPlay = canPlayExternal || canPlayEmbedded
  const noEmulatorTooltip = game
    ? `No emulator configured for ${game.platform}. Add one in Settings → Emulators or install an embedded core.`
    : ''

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  // Check embedded play capability when game changes
  useEffect(() => {
    if (game) {
      checkCanPlayEmbedded(game.platform).then(setEmbeddedCapability)
    }
  }, [game?.platform, checkCanPlayEmbedded])

  // Force focus to page content when GameDetails mounts
  // This ensures the gamepad hook is enabled (enabled: !isSidebarFocused)
  useEffect(() => {
    setIsSidebarFocused(false)

    // Clear navigation guard after short delay to prevent A button from firing immediately
    const timeout = setTimeout(() => {
      justNavigatedRef.current = false
    }, 200)

    return () => clearTimeout(timeout)
  }, [setIsSidebarFocused])

  // All handler functions need to be defined before useGamepadNavigation hook
  // to avoid hooks being called conditionally (after early return)
  const handlePlay = async () => {
    if (!game) return
    setShowPlayMenu(false)

    // If embedded is available and preferred (or no external available), use embedded
    if (canPlayEmbedded && (preferEmbedded || !canPlayExternal)) {
      navigate(`/play/${game.id}`)
      return
    }

    // Otherwise use external emulator
    setLaunching(true)
    try {
      await launchGame(game.id, game.preferredEmulator || undefined)
    } catch (error) {
      addToast('error', (error as Error)?.message ?? 'Failed to launch game')
    } finally {
      setLaunching(false)
    }
  }

  const handlePlayEmbedded = () => {
    if (!game) return
    setShowPlayMenu(false)
    navigate(`/play/${game.id}`)
  }

  const handlePlayExternal = async () => {
    if (!game) return
    setShowPlayMenu(false)
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
    if (!game) return
    await toggleFavorite(game.id)
    addToast('success', game.isFavorite ? 'Removed from favorites' : 'Added to favorites')
  }

  const handleScrapeMetadata = async () => {
    if (!game) return
    setScraping(true)
    try {
      const result = await scrapeGame(game.id)
      if (result.success) {
        if (result.matched) {
          addToast('success', `Metadata fetched for ${result.title || game.title}`)
        } else {
          addToast('warning', 'No match found in database. Try editing manually.')
        }
      } else {
        addToast('error', result.error || 'Failed to fetch metadata')
      }
    } catch (error) {
      addToast('error', (error as Error)?.message ?? 'Failed to fetch metadata')
    } finally {
      setScraping(false)
    }
  }

  const handleDelete = async () => {
    if (!game) return
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

  // Gamepad navigation
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isSidebarFocused) return

    // Handle play menu navigation
    if (showPlayMenu) {
      if (direction === 'up') {
        setPlayMenuIndex(0)
      } else if (direction === 'down') {
        setPlayMenuIndex(1)
      }
      return
    }

    // Handle delete confirmation navigation
    if (showDeleteConfirm) {
      if (direction === 'left') {
        setDeleteConfirmIndex(0)
      } else if (direction === 'right') {
        setDeleteConfirmIndex(1)
      }
      return
    }

    // Action buttons in a row (back button is separate, at top)
    const actionButtons: Array<'play' | 'favorite' | 'scrape' | 'edit' | 'settings' | 'delete'> = ['play', 'favorite', 'scrape', 'edit', 'settings', 'delete']
    const isOnBackButton = focusedButton === 'back'
    const actionIndex = actionButtons.indexOf(focusedButton as typeof actionButtons[number])

    if (isOnBackButton) {
      // From back button
      if (direction === 'down') {
        setFocusedButton('play')
      } else if (direction === 'left') {
        setIsSidebarFocused(true)
      }
    } else {
      // From action buttons row
      if (direction === 'left') {
        if (actionIndex === 0) {
          setIsSidebarFocused(true)
        } else {
          setFocusedButton(actionButtons[actionIndex - 1])
        }
      } else if (direction === 'right') {
        setFocusedButton(actionButtons[Math.min(actionButtons.length - 1, actionIndex + 1)])
      } else if (direction === 'up') {
        setFocusedButton('back')
      }
    }
  }, [isSidebarFocused, focusedButton, setIsSidebarFocused, showPlayMenu, showDeleteConfirm])

  const handleConfirm = useCallback(() => {
    // Ignore if we just navigated here (prevents double-activation from held A button)
    if (justNavigatedRef.current) return
    if (isSidebarFocused || !game) return

    // Handle play menu selection
    if (showPlayMenu) {
      if (playMenuIndex === 0) {
        handlePlayEmbedded()
      } else {
        handlePlayExternal()
      }
      return
    }

    // Handle delete confirmation selection
    if (showDeleteConfirm) {
      if (deleteConfirmIndex === 0) {
        handleDelete()
      } else {
        setShowDeleteConfirm(false)
      }
      return
    }

    switch (focusedButton) {
      case 'play':
        // If both options available, open dropdown; otherwise play directly
        if (canPlayEmbedded && canPlayExternal) {
          setShowPlayMenu(true)
          setPlayMenuIndex(0)
        } else {
          handlePlay()
        }
        break
      case 'favorite':
        handleToggleFavorite()
        break
      case 'scrape':
        handleScrapeMetadata()
        break
      case 'edit':
        setShowEditModal(true)
        break
      case 'settings':
        setShowGameSettingsModal(true)
        break
      case 'delete':
        setShowDeleteConfirm(true)
        setDeleteConfirmIndex(0)
        break
      case 'back':
        navigate(-1)
        break
    }
  }, [isSidebarFocused, focusedButton, game, showPlayMenu, playMenuIndex, showDeleteConfirm, deleteConfirmIndex, canPlayEmbedded, canPlayExternal, handlePlay, handlePlayEmbedded, handlePlayExternal, handleDelete, handleToggleFavorite, handleScrapeMetadata, navigate])

  const handleBack = useCallback(() => {
    if (isSidebarFocused) return
    
    // Close play menu if open
    if (showPlayMenu) {
      setShowPlayMenu(false)
      return
    }
    
    // Close delete confirmation if open
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false)
      return
    }
    
    navigate(-1)
  }, [isSidebarFocused, showPlayMenu, showDeleteConfirm, navigate])

  // Gamepad navigation (only when page is focused)
  // Disable gamepad nav when modals are open (they have their own gamepad handling)
  useGamepadNavigation({
    enabled: !isSidebarFocused && !showEditModal && !showGameSettingsModal,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  // Early return if game not found - must be AFTER all hooks to satisfy React's rules
  if (!game) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-surface-400">Game not found</p>
      </div>
    )
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
          className={`absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-surface-900/80 hover:bg-surface-800 rounded-lg backdrop-blur-sm transition-all ${
            !isSidebarFocused && focusedButton === 'back' ? 'ring-2 ring-accent scale-105' : ''
          }`}
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
              {/* Play button with optional dropdown */}
              <div className="relative">
                <div className={`flex rounded-lg transition-all ${
                  !isSidebarFocused && focusedButton === 'play' ? 'ring-2 ring-white scale-105' : ''
                }`}>
                  <button
                    onClick={handlePlay}
                    disabled={launching || !canPlay}
                    title={!canPlay ? noEmulatorTooltip : undefined}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-lg transition-all ${
                      canPlay ? 'bg-accent hover:bg-accent-hover' : 'bg-amber-600/80 hover:bg-amber-600'
                    } disabled:opacity-70 ${
                      canPlayEmbedded && canPlayExternal ? 'rounded-l-lg' : 'rounded-lg'
                    }`}
                  >
                    <Play size={24} fill="currentColor" />
                    {launching ? 'Launching…' : 'Play'}
                  </button>

                  {/* Show dropdown arrow when both options available */}
                  {canPlayEmbedded && canPlayExternal && (
                    <button
                      onClick={() => setShowPlayMenu(!showPlayMenu)}
                      className="px-2 bg-accent hover:bg-accent-hover rounded-r-lg border-l border-white/20"
                    >
                      <ChevronDown size={20} />
                    </button>
                  )}
                </div>

                {/* Dropdown menu */}
                {showPlayMenu && canPlayEmbedded && canPlayExternal && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-surface-800 rounded-lg shadow-xl border border-surface-700 overflow-hidden z-10">
                    <button
                      onClick={handlePlayEmbedded}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-700 text-left transition-all ${
                        playMenuIndex === 0 ? 'bg-surface-700 ring-2 ring-accent ring-inset' : ''
                      }`}
                    >
                      <Monitor size={18} className="text-accent" />
                      <div>
                        <div className="font-medium">Play in Browser</div>
                        <div className="text-xs text-surface-400">Built-in emulator</div>
                      </div>
                    </button>
                    <button
                      onClick={handlePlayExternal}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-700 text-left border-t border-surface-700 transition-all ${
                        playMenuIndex === 1 ? 'bg-surface-700 ring-2 ring-accent ring-inset' : ''
                      }`}
                    >
                      <Gamepad2 size={18} className="text-surface-300" />
                      <div>
                        <div className="font-medium">Play with Emulator</div>
                        <div className="text-xs text-surface-400">External application</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleToggleFavorite}
                className={`p-3 rounded-lg transition-all ${
                  game.isFavorite
                    ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                    : 'bg-surface-800 hover:bg-surface-700'
                } ${
                  !isSidebarFocused && focusedButton === 'favorite' ? 'ring-2 ring-accent scale-105' : ''
                }`}
                title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star size={20} className={game.isFavorite ? 'fill-yellow-500' : ''} />
              </button>

              <button
                onClick={handleScrapeMetadata}
                disabled={scraping || isScraping}
                className={`p-3 bg-surface-800 hover:bg-surface-700 rounded-lg disabled:opacity-50 transition-all ${
                  !isSidebarFocused && focusedButton === 'scrape' ? 'ring-2 ring-accent scale-105' : ''
                }`}
                title="Fetch metadata from Hasheous"
              >
                {scraping ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
              </button>

              <button
                onClick={() => setShowEditModal(true)}
                className={`p-3 bg-surface-800 hover:bg-surface-700 rounded-lg transition-all ${
                  !isSidebarFocused && focusedButton === 'edit' ? 'ring-2 ring-accent scale-105' : ''
                }`}
                title="Edit metadata"
              >
                <Edit size={20} />
              </button>

              <button
                onClick={() => setShowGameSettingsModal(true)}
                className={`p-3 bg-surface-800 hover:bg-surface-700 rounded-lg transition-all ${
                  !isSidebarFocused && focusedButton === 'settings' ? 'ring-2 ring-accent scale-105' : ''
                }`}
                title="Game settings (emulator override)"
              >
                <Settings2 size={20} />
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={`p-3 bg-surface-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all ${
                  !isSidebarFocused && focusedButton === 'delete' ? 'ring-2 ring-accent scale-105' : ''
                }`}
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
                    className={`px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white disabled:opacity-50 transition-all ${
                      deleteConfirmIndex === 0 ? 'ring-2 ring-white scale-105' : ''
                    }`}
                  >
                    {isDeleting ? 'Removing...' : 'Remove'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded transition-all ${
                      deleteConfirmIndex === 1 ? 'ring-2 ring-accent scale-105' : ''
                    }`}
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
                <span>Play time: {formatPlayTime(game.playTime)}</span>
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
