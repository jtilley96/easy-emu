import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Grid, List, SlidersHorizontal, Star, Clock } from 'lucide-react'
import { useLibraryStore } from '../store/libraryStore'
import GameCard from '../components/GameCard'
import SearchBar from '../components/SearchBar'

type ViewMode = 'grid' | 'list'
type SortBy = 'title' | 'lastPlayed' | 'platform' | 'recentlyAdded'
type QuickFilter = 'recent' | 'favorites' | null

export default function Library() {
  const { games, isScanning, loadLibrary } = useLibraryStore()
  
  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])
  const [searchParams] = useSearchParams()
  const quickFilter = searchParams.get('filter') as QuickFilter
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('title')
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null)

  const platforms = useMemo(() => {
    const platformSet = new Set(games.map(g => g.platform))
    return Array.from(platformSet).sort()
  }, [games])

  const filteredGames = useMemo(() => {
    let result = [...games]

    // Quick filter (from sidebar)
    if (quickFilter === 'favorites') {
      result = result.filter(game => game.isFavorite)
    } else if (quickFilter === 'recent') {
      // Show games played in the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      result = result.filter(game => {
        if (!game.lastPlayed) return false
        return new Date(game.lastPlayed) >= thirtyDaysAgo
      })
      // Sort by last played for recent filter
      result.sort((a, b) => (b.lastPlayed || '').localeCompare(a.lastPlayed || ''))
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(game =>
        game.title.toLowerCase().includes(query) ||
        game.platform.toLowerCase().includes(query)
      )
    }

    // Platform filter
    if (filterPlatform) {
      result = result.filter(game => game.platform === filterPlatform)
    }

    // Sort (skip if quick filter already sorted)
    if (quickFilter !== 'recent') {
      result.sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title)
          case 'lastPlayed':
            return (b.lastPlayed || '').localeCompare(a.lastPlayed || '')
          case 'platform':
            return a.platform.localeCompare(b.platform)
          case 'recentlyAdded':
            return (b.addedAt || '').localeCompare(a.addedAt || '')
          default:
            return 0
        }
      })
    }

    return result
  }, [games, searchQuery, sortBy, filterPlatform, quickFilter])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {quickFilter === 'favorites' && <Star size={24} className="text-yellow-400" />}
            {quickFilter === 'recent' && <Clock size={24} className="text-accent" />}
            <h1 className="text-2xl font-bold">
              {quickFilter === 'favorites' ? 'Favorites' : quickFilter === 'recent' ? 'Recently Played' : 'Library'}
            </h1>
          </div>
          <span className="text-surface-400 text-sm">
            {filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search games..."
          />

          {/* Platform filter */}
          <select
            value={filterPlatform || ''}
            onChange={e => setFilterPlatform(e.target.value || null)}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">All Platforms</option>
            {platforms.map(platform => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="title">Sort by Title</option>
            <option value="lastPlayed">Last Played</option>
            <option value="platform">Platform</option>
            <option value="recentlyAdded">Recently Added</option>
          </select>

          {/* View mode toggle */}
          <div className="flex border border-surface-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-accent' : 'bg-surface-800 hover:bg-surface-700'}`}
              title="Grid view"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-accent' : 'bg-surface-800 hover:bg-surface-700'}`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isScanning && (
          <div className="mb-4 flex items-center gap-3 bg-surface-800 rounded-lg px-4 py-3">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full spinner" />
            <span className="text-surface-300">Scanning library...</span>
          </div>
        )}

        {filteredGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {games.length === 0 ? (
              <>
                <div className="w-20 h-20 bg-surface-800 rounded-full flex items-center justify-center mb-4">
                  <SlidersHorizontal size={32} className="text-surface-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No games in library</h2>
                <p className="text-surface-400 mb-4">
                  Add ROM folders in Settings to start building your library.
                </p>
                <a
                  href="#/settings/library"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium"
                >
                  Configure Library
                </a>
              </>
            ) : quickFilter === 'favorites' ? (
              <>
                <Star size={48} className="text-surface-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
                <p className="text-surface-400">
                  Click the star icon on any game to add it to your favorites.
                </p>
              </>
            ) : quickFilter === 'recent' ? (
              <>
                <Clock size={48} className="text-surface-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No recently played games</h2>
                <p className="text-surface-400">
                  Games you play will appear here for quick access.
                </p>
              </>
            ) : (
              <>
                <Search size={48} className="text-surface-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No games found</h2>
                <p className="text-surface-400">
                  Try adjusting your search or filters.
                </p>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
            {filteredGames.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredGames.map(game => (
              <GameCard key={game.id} game={game} variant="list" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
