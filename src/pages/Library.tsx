import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Grid, List, SlidersHorizontal, Star, Clock, ChevronDown } from 'lucide-react'
import { useLibraryStore } from '../store/libraryStore'
import { useUIStore } from '../store/uiStore'
import GameCard from '../components/GameCard'
import SearchBar from '../components/SearchBar'
import OnScreenKeyboard from '../components/OnScreenKeyboard'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import { useLayoutContext } from '../components/Layout'

type SortBy = 'title' | 'lastPlayed' | 'platform' | 'recentlyAdded'
type QuickFilter = 'recent' | 'favorites' | null

// Sort options for dropdown
const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'lastPlayed', label: 'Last Played' },
  { value: 'platform', label: 'Platform' },
  { value: 'recentlyAdded', label: 'Recently Added' }
]

export default function Library() {
  const { games, isScanning, loadLibrary } = useLibraryStore()
  const { libraryPlatformFilter, setLibraryPlatformFilter, libraryViewMode, setLibraryViewMode } = useUIStore()
  const navigate = useNavigate()
  const { isSidebarFocused, setIsSidebarFocused } = useLayoutContext()
  const gridRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [headerFocusIndex, setHeaderFocusIndex] = useState(-1) // -1 = not in header, 0-3 = header items

  // Header items: 0=Search, 1=Platform, 2=Sort, 3=ViewMode
  const HEADER_ITEM_COUNT = 4

  // On-screen keyboard state
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  // Dropdown state for header items
  const [openDropdown, setOpenDropdown] = useState<'platform' | 'sort' | null>(null)
  const [dropdownIndex, setDropdownIndex] = useState(0)
  
  // Prevent A button from firing immediately after navigation or focus change
  const justActivatedRef = useRef(true)
  
  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])
  
  // Reset activation guard when focus changes to/from sidebar
  useEffect(() => {
    if (isSidebarFocused) {
      // Page lost focus - set guard for when it regains focus
      justActivatedRef.current = true
    } else {
      // Page gained focus - clear guard after short delay
      const timeout = setTimeout(() => {
        justActivatedRef.current = false
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [isSidebarFocused])
  const [searchParams] = useSearchParams()
  const quickFilter = searchParams.get('filter') as QuickFilter
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('title')

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
      const query = searchQuery.trim().toLowerCase()
      if (query) {
        result = result.filter(game =>
          game.title.toLowerCase().includes(query) ||
          game.platform.toLowerCase().includes(query)
        )
      }
    }

    // Platform filter
    if (libraryPlatformFilter) {
      result = result.filter(game => game.platform === libraryPlatformFilter)
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
  }, [games, searchQuery, sortBy, libraryPlatformFilter, quickFilter])

  // Reset focus when games change
  useEffect(() => {
    setFocusedIndex(0)
    setHeaderFocusIndex(-1)
  }, [filteredGames.length])

  // Calculate columns based on viewport width
  const getColumns = useCallback(() => {
    if (!gridRef.current) return 6 // default
    const width = gridRef.current.offsetWidth
    // Match Tailwind breakpoints: 2, 3, 4, 5, 6, 8
    if (width >= 1536) return 8 // 2xl
    if (width >= 1280) return 6 // xl
    if (width >= 1024) return 5 // lg
    if (width >= 768) return 4  // md
    if (width >= 640) return 3  // sm
    return 2 // default
  }, [])

  // Get platform options for dropdown
  const platformOptions = useMemo(() => [
    { value: '', label: 'All Platforms' },
    ...platforms.map(p => ({ value: p, label: p }))
  ], [platforms])

  // Handle gamepad navigation
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    console.log('[Library] handleNavigate:', direction, 'focusedIndex:', focusedIndex)
    if (isSidebarFocused || keyboardOpen) return

    // If a dropdown is open, navigate within it
    if (openDropdown) {
      const options = openDropdown === 'platform' ? platformOptions : SORT_OPTIONS
      if (direction === 'up') {
        setDropdownIndex(prev => Math.max(0, prev - 1))
      } else if (direction === 'down') {
        setDropdownIndex(prev => Math.min(options.length - 1, prev + 1))
      }
      return
    }

    // If header is focused, handle header navigation
    if (headerFocusIndex >= 0) {
      switch (direction) {
        case 'down':
          // Move focus to game grid (if there are games)
          if (filteredGames.length > 0) {
            setHeaderFocusIndex(-1)
            setFocusedIndex(0)
          }
          break
        case 'up':
          // Return focus to sidebar
          setHeaderFocusIndex(-1)
          setIsSidebarFocused(true)
          break
        case 'left':
          if (headerFocusIndex > 0) {
            // Move to previous header item
            setHeaderFocusIndex(headerFocusIndex - 1)
          } else {
            // At first header item - return to sidebar
            setHeaderFocusIndex(-1)
            setIsSidebarFocused(true)
          }
          break
        case 'right':
          if (headerFocusIndex < HEADER_ITEM_COUNT - 1) {
            // Move to next header item
            setHeaderFocusIndex(headerFocusIndex + 1)
          }
          break
      }
      return
    }

    if (filteredGames.length === 0) return

    // Game grid navigation
    const columns = libraryViewMode === 'grid' ? getColumns() : 1
    const totalGames = filteredGames.length

    let shouldMoveToSidebar = false

    const newIndex = (() => {
      let newIdx = focusedIndex

      if (libraryViewMode === 'list') {
        // List mode: simple up/down navigation
        switch (direction) {
          case 'up':
            if (focusedIndex === 0) {
              // At top - move focus to header controls (start at search)
              setHeaderFocusIndex(0)
              return focusedIndex
            }
            newIdx = focusedIndex - 1
            break
          case 'down':
            newIdx = Math.min(focusedIndex + 1, totalGames - 1)
            break
          case 'left':
            shouldMoveToSidebar = true
            return focusedIndex
          case 'right':
            // No-op in list mode
            break
        }
      } else {
        // Grid mode: grid navigation
        switch (direction) {
          case 'left':
            if (focusedIndex % columns === 0) {
              // At start of row - return focus to sidebar
              shouldMoveToSidebar = true
              return focusedIndex
            }
            newIdx = focusedIndex - 1
            break
          case 'right':
            if ((focusedIndex + 1) % columns === 0 || focusedIndex === totalGames - 1) {
              // At end of row or last item - wrap to start of next row
              newIdx = focusedIndex < totalGames - 1 ? focusedIndex + 1 : 0
            } else {
              newIdx = focusedIndex + 1
            }
            break
          case 'up':
            if (focusedIndex - columns >= 0) {
              newIdx = focusedIndex - columns
            } else {
              // At top row - move focus to header controls (start at search)
              setHeaderFocusIndex(0)
              return focusedIndex
            }
            break
          case 'down':
            if (focusedIndex + columns < totalGames) {
              newIdx = focusedIndex + columns
            } else {
              // At bottom row - wrap to top
              const targetCol = focusedIndex % columns
              newIdx = Math.min(targetCol, totalGames - 1)
            }
            break
        }
      }

      return Math.max(0, Math.min(newIdx, totalGames - 1))
    })()

    // Update state separately to avoid render warnings
    console.log('[Library] newIndex:', newIndex, 'shouldMoveToSidebar:', shouldMoveToSidebar, 'columns:', libraryViewMode === 'grid' ? getColumns() : 1)
    if (shouldMoveToSidebar) {
      setIsSidebarFocused(true)
    } else {
      setFocusedIndex(newIndex)
    }
  }, [isSidebarFocused, keyboardOpen, openDropdown, platformOptions, headerFocusIndex, focusedIndex, filteredGames.length, libraryViewMode, getColumns, setIsSidebarFocused])

  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return
    if (isSidebarFocused || keyboardOpen) return

    // If a dropdown is open, confirm selection
    if (openDropdown) {
      if (openDropdown === 'platform') {
        const selected = platformOptions[dropdownIndex]
        setLibraryPlatformFilter(selected.value || null)
      } else if (openDropdown === 'sort') {
        const selected = SORT_OPTIONS[dropdownIndex]
        setSortBy(selected.value)
      }
      setOpenDropdown(null)
      return
    }

    // Handle header item confirmations
    if (headerFocusIndex >= 0) {
      switch (headerFocusIndex) {
        case 0: // Search - open on-screen keyboard
          setKeyboardOpen(true)
          break
        case 1: // Platform filter - open dropdown
          {
            const currentIdx = platformOptions.findIndex(o => o.value === (libraryPlatformFilter || ''))
            setDropdownIndex(currentIdx >= 0 ? currentIdx : 0)
            setOpenDropdown('platform')
          }
          break
        case 2: // Sort - open dropdown
          {
            const currentIdx = SORT_OPTIONS.findIndex(o => o.value === sortBy)
            setDropdownIndex(currentIdx >= 0 ? currentIdx : 0)
            setOpenDropdown('sort')
          }
          break
        case 3: // View mode - toggle
          setLibraryViewMode(libraryViewMode === 'grid' ? 'list' : 'grid')
          break
      }
      return
    }

    if (!filteredGames[focusedIndex]) return
    navigate(`/game/${filteredGames[focusedIndex].id}`)
  }, [isSidebarFocused, keyboardOpen, openDropdown, headerFocusIndex, focusedIndex, filteredGames, navigate, platformOptions, dropdownIndex, libraryPlatformFilter, setLibraryPlatformFilter, sortBy, setSortBy, libraryViewMode, setLibraryViewMode])

  const handleBack = useCallback(() => {
    if (isSidebarFocused || keyboardOpen) return

    // If dropdown is open, close it
    if (openDropdown) {
      setOpenDropdown(null)
      return
    }

    if (headerFocusIndex >= 0) {
      // From header, go back to sidebar
      setHeaderFocusIndex(-1)
      setIsSidebarFocused(true)
    } else {
      // From game grid, go directly to sidebar
      setIsSidebarFocused(true)
    }
  }, [isSidebarFocused, keyboardOpen, openDropdown, headerFocusIndex, setIsSidebarFocused])

  // Gamepad navigation (only when page is focused and keyboard is closed)
  useGamepadNavigation({
    enabled: !isSidebarFocused && !keyboardOpen,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  // Handle keyboard submit
  const handleKeyboardSubmit = useCallback((value: string) => {
    setSearchQuery(value)
    setKeyboardOpen(false)
  }, [])

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
          <div className={`transition-all ${headerFocusIndex === 0 ? 'ring-2 ring-accent rounded-lg scale-[1.02]' : ''}`}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search games..."
            />
          </div>

          {/* Platform filter */}
          <div className="relative">
            <button
              onClick={() => {
                const currentIdx = platformOptions.findIndex(o => o.value === (libraryPlatformFilter || ''))
                setDropdownIndex(currentIdx >= 0 ? currentIdx : 0)
                setOpenDropdown(openDropdown === 'platform' ? null : 'platform')
              }}
              className={`flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm transition-all ${
                headerFocusIndex === 1 || openDropdown === 'platform' ? 'ring-2 ring-accent scale-[1.02]' : ''
              }`}
            >
              <span>{libraryPlatformFilter || 'All Platforms'}</span>
              <ChevronDown size={16} className={`transition-transform ${openDropdown === 'platform' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'platform' && (
              <div className="absolute top-full left-0 mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-20 min-w-full max-h-64 overflow-auto">
                {platformOptions.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setLibraryPlatformFilter(option.value || null)
                      setOpenDropdown(null)
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                      index === dropdownIndex ? 'bg-accent text-white' : 'hover:bg-surface-700'
                    } ${index === 0 ? 'rounded-t-lg' : ''} ${index === platformOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => {
                const currentIdx = SORT_OPTIONS.findIndex(o => o.value === sortBy)
                setDropdownIndex(currentIdx >= 0 ? currentIdx : 0)
                setOpenDropdown(openDropdown === 'sort' ? null : 'sort')
              }}
              className={`flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm transition-all ${
                headerFocusIndex === 2 || openDropdown === 'sort' ? 'ring-2 ring-accent scale-[1.02]' : ''
              }`}
            >
              <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Title'}</span>
              <ChevronDown size={16} className={`transition-transform ${openDropdown === 'sort' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'sort' && (
              <div className="absolute top-full left-0 mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-20 min-w-full">
                {SORT_OPTIONS.map((option, index) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value)
                      setOpenDropdown(null)
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                      index === dropdownIndex ? 'bg-accent text-white' : 'hover:bg-surface-700'
                    } ${index === 0 ? 'rounded-t-lg' : ''} ${index === SORT_OPTIONS.length - 1 ? 'rounded-b-lg' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View mode toggle */}
          <div className={`flex border border-surface-700 rounded-lg overflow-hidden transition-all ${headerFocusIndex === 3 ? 'ring-2 ring-accent scale-[1.02]' : ''}`}>
            <button
              onClick={() => setLibraryViewMode('grid')}
              className={`p-2 ${libraryViewMode === 'grid' ? 'bg-accent' : 'bg-surface-800 hover:bg-surface-700'}`}
              title="Grid view"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setLibraryViewMode('list')}
              className={`p-2 ${libraryViewMode === 'list' ? 'bg-accent' : 'bg-surface-800 hover:bg-surface-700'}`}
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
        ) : libraryViewMode === 'grid' ? (
          <div 
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4"
          >
            {filteredGames.map((game, index) => (
              <div
                key={game.id}
                className={!isSidebarFocused && headerFocusIndex === -1 && index === focusedIndex ? 'ring-2 ring-accent rounded-lg' : ''}
              >
                <GameCard game={game} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2" ref={gridRef}>
            {filteredGames.map((game, index) => (
              <div
                key={game.id}
                className={!isSidebarFocused && headerFocusIndex === -1 && index === focusedIndex ? 'ring-2 ring-accent rounded-lg' : ''}
              >
                <GameCard key={game.id} game={game} variant="list" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* On-screen keyboard for search */}
      <OnScreenKeyboard
        isOpen={keyboardOpen}
        initialValue={searchQuery}
        onClose={() => setKeyboardOpen(false)}
        onSubmit={handleKeyboardSubmit}
        title="Search Games"
      />
    </div>
  )
}
