import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useLibraryStore } from '../../store/libraryStore'
import { PLATFORMS } from '../../constants/platforms'
import { Game } from '../../types'
import { BPLayoutContext } from '../../components/bigpicture/BPLayout'
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation'
import BPGameGrid from '../../components/bigpicture/BPGameGrid'
import { useUIStore } from '../../store/uiStore'

export default function BPSystems() {
  const navigate = useNavigate()
  const { isNavFocused, setIsNavFocused } = useOutletContext<BPLayoutContext>()
  const { games, loadLibrary, toggleFavorite } = useLibraryStore()
  const { addToast } = useUIStore()

  const [selectedPlatformIndex, setSelectedPlatformIndex] = useState(0)
  const [isPlatformListFocused, setIsPlatformListFocused] = useState(true)

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  // Get platforms that have games
  const platformsWithGames = useMemo(() => {
    const platformCounts = new Map<string, number>()
    games.forEach(game => {
      const count = platformCounts.get(game.platform) || 0
      platformCounts.set(game.platform, count + 1)
    })

    return PLATFORMS.filter(p => platformCounts.get(p.id)).map(p => ({
      ...p,
      gameCount: platformCounts.get(p.id) || 0
    }))
  }, [games])

  const selectedPlatform = platformsWithGames[selectedPlatformIndex]

  // Filter games for selected platform
  const platformGames = useMemo(() => {
    if (!selectedPlatform) return []
    return games
      .filter(g => g.platform === selectedPlatform.id)
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [games, selectedPlatform])

  const handleBack = useCallback(() => {
    if (!isPlatformListFocused) {
      setIsPlatformListFocused(true)
    } else {
      // Navigate back to library instead of just focusing nav
      navigate('/bigpicture')
    }
  }, [isPlatformListFocused, navigate])

  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!isPlatformListFocused) return

    if (direction === 'up') {
      if (selectedPlatformIndex === 0) {
        // At top of platforms - go to nav tabs
        setIsNavFocused(true)
      } else {
        setSelectedPlatformIndex(prev => prev - 1)
      }
    } else if (direction === 'down') {
      setSelectedPlatformIndex(prev => Math.min(platformsWithGames.length - 1, prev + 1))
    } else if (direction === 'right') {
      if (platformGames.length > 0) {
        setIsPlatformListFocused(false)
      }
    }
  }, [isPlatformListFocused, platformsWithGames.length, platformGames.length, selectedPlatformIndex, setIsNavFocused])

  const handleConfirm = useCallback(() => {
    if (isPlatformListFocused && platformGames.length > 0) {
      setIsPlatformListFocused(false)
    }
  }, [isPlatformListFocused, platformGames.length])

  // Gamepad navigation for platform list (disabled when nav is focused)
  useGamepadNavigation({
    enabled: isPlatformListFocused && !isNavFocused,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  const handleSelectGame = useCallback((game: Game) => {
    navigate(`/bigpicture/game/${game.id}`)
  }, [navigate])

  const handleFavoriteGame = useCallback(async (game: Game) => {
    await toggleFavorite(game.id)
    addToast('success', game.isFavorite ? 'Removed from favorites' : 'Added to favorites')
  }, [toggleFavorite, addToast])

  if (platformsWithGames.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-surface-400 mb-2">No systems found</p>
          <p className="text-surface-500">Add some ROMs to your library</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* Platform List */}
      <div className="w-80 bg-surface-900/50 border-r border-surface-800 overflow-auto">
        <div className="p-4 space-y-2">
          {platformsWithGames.map((platform, index) => (
            <button
              key={platform.id}
              onClick={() => {
                setSelectedPlatformIndex(index)
                setIsPlatformListFocused(true)
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all ${
                selectedPlatformIndex === index && isPlatformListFocused
                  ? 'bg-accent scale-105 shadow-lg bp-focus'
                  : selectedPlatformIndex === index
                  ? 'bg-surface-700'
                  : 'hover:bg-surface-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{platform.icon}</span>
                <span className="font-medium">{platform.shortName}</span>
              </div>
              <span className="text-surface-400">{platform.gameCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Game Grid */}
      <div className="flex-1 overflow-hidden">
        {selectedPlatform && (
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 px-8 py-4 bg-surface-900/50 border-b border-surface-800">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span>{selectedPlatform.icon}</span>
                {selectedPlatform.name}
                <span className="text-surface-400 text-lg font-normal">
                  ({platformGames.length} games)
                </span>
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <BPGameGrid
                games={platformGames}
                enabled={!isPlatformListFocused && !isNavFocused}
                onSelectGame={handleSelectGame}
                onFavoriteGame={handleFavoriteGame}
                onBack={() => setIsPlatformListFocused(true)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
