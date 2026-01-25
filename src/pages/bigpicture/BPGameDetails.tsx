import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Play, Star, Clock, Calendar, ArrowLeft, Loader2 } from 'lucide-react'
import { useLibraryStore } from '../../store/libraryStore'
import { useEmulatorStore } from '../../store/emulatorStore'
import { useUIStore } from '../../store/uiStore'
import { BPLayoutContext } from '../../components/bigpicture/BPLayout'
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation'
import { pathToLocalImageUrl } from '../../utils/image'

type FocusItem = 'play' | 'favorite' | 'back'

export default function BPGameDetails() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { isNavFocused, setIsNavFocused } = useOutletContext<BPLayoutContext>()
  const { games, toggleFavorite, loadLibrary } = useLibraryStore()
  const { startGame } = useEmulatorStore()
  const { addToast } = useUIStore()

  const [focusedItem, setFocusedItem] = useState<FocusItem>('play')
  const [isLaunching, setIsLaunching] = useState(false)

  const game = games.find(g => g.id === gameId)

  useEffect(() => {
    if (games.length === 0) {
      loadLibrary()
    }
  }, [games.length, loadLibrary])

  const handlePlay = useCallback(async () => {
    if (!game || isLaunching) return

    setIsLaunching(true)
    try {
      const result = await startGame(game.id)
      if (result.success) {
        // Navigate to emulator view (state used on exit to return to big picture)
        navigate(`/play/${game.id}`, { state: { from: 'bigpicture' } })
      } else {
        addToast('error', result.error || 'Failed to start game')
        setIsLaunching(false)
      }
    } catch (error) {
      addToast('error', 'Failed to start game')
      setIsLaunching(false)
    }
  }, [game, isLaunching, startGame, navigate, addToast])

  const handleFavorite = useCallback(async () => {
    if (!game) return
    await toggleFavorite(game.id)
    addToast('success', game.isFavorite ? 'Removed from favorites' : 'Added to favorites')
  }, [game, toggleFavorite, addToast])

  const handleBack = useCallback(() => {
    navigate('/bigpicture')
  }, [navigate])

  // Navigation
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const items: FocusItem[] = ['back', 'play', 'favorite']
    const currentIndex = items.indexOf(focusedItem)

    if (direction === 'left') {
      setFocusedItem(items[Math.max(0, currentIndex - 1)])
    } else if (direction === 'right') {
      setFocusedItem(items[Math.min(items.length - 1, currentIndex + 1)])
    } else if (direction === 'up') {
      setIsNavFocused(true)
    }
  }, [focusedItem, setIsNavFocused])

  const handleConfirm = useCallback(() => {
    switch (focusedItem) {
      case 'play':
        handlePlay()
        break
      case 'favorite':
        handleFavorite()
        break
      case 'back':
        handleBack()
        break
    }
  }, [focusedItem, handlePlay, handleFavorite, handleBack])

  // Gamepad navigation (disabled when nav is focused)
  useGamepadNavigation({
    enabled: !isNavFocused,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleConfirm()
          break
        case 'Escape':
          e.preventDefault()
          handleBack()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleNavigate('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNavigate('right')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleConfirm, handleBack, handleNavigate])

  if (!game) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-surface-400 mb-4">Game not found</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-surface-700 hover:bg-surface-600 rounded-lg"
          >
            Return to Library
          </button>
        </div>
      </div>
    )
  }

  // Format play time
  const formatPlayTime = (minutes?: number) => {
    if (!minutes) return 'Never played'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <div className="h-full relative">
      {/* Background backdrop */}
      {game.backdropPath ? (
        <div className="absolute inset-0">
          <img
            src={pathToLocalImageUrl(game.backdropPath)}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-950 via-surface-950/90 to-surface-950/50" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-surface-900 to-surface-950" />
      )}

      {/* Content */}
      <div className="relative h-full flex items-center px-16">
        <div className="flex gap-12 max-w-6xl">
          {/* Cover Art */}
          <div className="flex-shrink-0">
            <div className="w-72 h-96 rounded-xl overflow-hidden shadow-2xl">
              {game.coverPath ? (
                <img
                  src={pathToLocalImageUrl(game.coverPath)}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-surface-800 flex items-center justify-center">
                  <span className="text-6xl font-bold text-surface-600">
                    {game.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 max-w-xl">
            <h1 className="text-4xl font-bold mb-2">{game.title}</h1>

            <div className="flex items-center gap-4 text-surface-300 mb-6">
              {game.platform && <span>{game.platform}</span>}
              {game.releaseDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={16} />
                  {new Date(game.releaseDate).getFullYear()}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center gap-2 text-surface-300">
                <Clock size={20} />
                <span>{formatPlayTime(game.playTime)}</span>
              </div>
              {game.lastPlayed && (
                <span className="text-surface-400 text-sm">
                  Last played: {new Date(game.lastPlayed).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Description */}
            {game.description && (
              <p className="text-surface-300 mb-8 line-clamp-4">
                {game.description}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className={`flex items-center gap-2 px-6 py-4 rounded-xl text-lg transition-all ${
                  focusedItem === 'back'
                    ? 'bg-surface-600 scale-105 shadow-lg bp-focus'
                    : 'bg-surface-700 hover:bg-surface-600'
                }`}
              >
                <ArrowLeft size={24} />
                Back
              </button>

              <button
                onClick={handlePlay}
                disabled={isLaunching}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl text-xl font-semibold transition-all ${
                  focusedItem === 'play'
                    ? 'bg-accent scale-105 shadow-xl bp-focus'
                    : 'bg-accent/80 hover:bg-accent'
                } ${isLaunching ? 'opacity-70' : ''}`}
              >
                {isLaunching ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : (
                  <Play size={28} />
                )}
                {isLaunching ? 'Launching...' : 'Play'}
              </button>

              <button
                onClick={handleFavorite}
                className={`flex items-center gap-2 px-6 py-4 rounded-xl text-lg transition-all ${
                  focusedItem === 'favorite'
                    ? 'bg-surface-600 scale-105 shadow-lg bp-focus'
                    : 'bg-surface-700 hover:bg-surface-600'
                }`}
              >
                <Star
                  size={24}
                  className={game.isFavorite ? 'text-yellow-400 fill-yellow-400' : ''}
                />
                {game.isFavorite ? 'Favorited' : 'Favorite'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
