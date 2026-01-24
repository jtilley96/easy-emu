import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Star, Clock, Gamepad2 } from 'lucide-react'
import { useLibraryStore } from '../../store/libraryStore'
import { useUIStore } from '../../store/uiStore'
import { Game } from '../../types'
import BPGameGrid from '../../components/bigpicture/BPGameGrid'
import { BPLayoutContext } from '../../components/bigpicture/BPLayout'
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation'

type FilterType = 'all' | 'favorites' | 'recent'

const FILTERS: { id: FilterType; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Games', icon: <Gamepad2 size={18} /> },
  { id: 'favorites', label: 'Favorites', icon: <Star size={18} /> },
  { id: 'recent', label: 'Recently Played', icon: <Clock size={18} /> }
]

export default function BPLibrary() {
  const navigate = useNavigate()
  const { isNavFocused, setIsNavFocused } = useOutletContext<BPLayoutContext>()
  const { games, loadLibrary, toggleFavorite } = useLibraryStore()
  const { addToast } = useUIStore()

  const [filter, setFilter] = useState<FilterType>('all')
  const [isFilterFocused, setIsFilterFocused] = useState(false)
  const [focusedFilterIndex, setFocusedFilterIndex] = useState(0)

  // Load library on mount
  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  // Filter games
  const filteredGames = useMemo(() => {
    let result = [...games]

    switch (filter) {
      case 'favorites':
        result = result.filter(g => g.isFavorite)
        break
      case 'recent':
        result = result
          .filter(g => g.lastPlayed)
          .sort((a, b) => {
            const dateA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0
            const dateB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0
            return dateB - dateA
          })
          .slice(0, 20)
        break
      default:
        // Sort alphabetically by default
        result.sort((a, b) => a.title.localeCompare(b.title))
    }

    return result
  }, [games, filter])

  const handleSelectGame = useCallback((game: Game) => {
    navigate(`/bigpicture/game/${game.id}`)
  }, [navigate])

  const handleFavoriteGame = useCallback(async (game: Game) => {
    await toggleFavorite(game.id)
    addToast('success', game.isFavorite ? 'Removed from favorites' : 'Added to favorites')
  }, [toggleFavorite, addToast])

  const handleBack = useCallback(() => {
    setIsNavFocused(true)
    setIsFilterFocused(false)
  }, [setIsNavFocused])

  // Filter navigation
  const handleFilterNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!isFilterFocused) return

    if (direction === 'left') {
      setFocusedFilterIndex(prev => Math.max(0, prev - 1))
    } else if (direction === 'right') {
      setFocusedFilterIndex(prev => Math.min(FILTERS.length - 1, prev + 1))
    } else if (direction === 'down') {
      setIsFilterFocused(false)
    } else if (direction === 'up') {
      setIsNavFocused(true)
      setIsFilterFocused(false)
    }
  }, [isFilterFocused, setIsNavFocused])

  const handleFilterConfirm = useCallback(() => {
    if (isFilterFocused) {
      setFilter(FILTERS[focusedFilterIndex].id)
      setIsFilterFocused(false)
    }
  }, [isFilterFocused, focusedFilterIndex])

  // Gamepad navigation for filters (disabled when nav is focused)
  useGamepadNavigation({
    enabled: isFilterFocused && !isNavFocused,
    onNavigate: handleFilterNavigate,
    onConfirm: handleFilterConfirm,
    onBack: handleBack
  })

  // Handle entering filter mode with up from grid
  const handleGridBack = useCallback(() => {
    setIsFilterFocused(true)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Filter Bar */}
      <div className="flex-shrink-0 px-8 py-4 bg-surface-900/50">
        <div className="flex items-center gap-4">
          <span className="text-surface-400">Filter:</span>
          <div className="flex gap-2">
            {FILTERS.map((f, index) => {
              const isActive = filter === f.id
              const isFocused = isFilterFocused && index === focusedFilterIndex

              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilter(f.id)
                    setFocusedFilterIndex(index)
                  }}
                  onFocus={() => {
                    setFocusedFilterIndex(index)
                    setIsFilterFocused(true)
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    isFocused
                      ? 'bg-accent text-white scale-105 shadow-lg bp-focus'
                      : isActive
                      ? 'bg-surface-700 text-white'
                      : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              )
            })}
          </div>
          <span className="ml-auto text-surface-400">
            {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Game Grid */}
      <div className="flex-1 overflow-hidden">
        <BPGameGrid
          games={filteredGames}
          enabled={!isFilterFocused && !isNavFocused}
          onSelectGame={handleSelectGame}
          onFavoriteGame={handleFavoriteGame}
          onBack={handleGridBack}
        />
      </div>
    </div>
  )
}
