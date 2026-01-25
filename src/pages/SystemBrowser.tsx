import { useCallback, useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useLibraryStore } from '../store/libraryStore'
import { PLATFORMS } from '../constants/platforms'
import { getPlatformImageUrl } from '../constants/platformImages'
import GameCard from '../components/GameCard'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import { useLayoutContext } from '../components/Layout'

export default function SystemBrowser() {
  const { platform } = useParams<{ platform?: string }>()
  const { games } = useLibraryStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { isSidebarFocused, setIsSidebarFocused } = useLayoutContext()
  const [focusedIndex, setFocusedIndex] = useState(0)
  const justNavigatedRef = useRef(false)

  // Group games by platform
  const gamesByPlatform = games.reduce((acc, game) => {
    if (!acc[game.platform]) {
      acc[game.platform] = []
    }
    acc[game.platform].push(game)
    return acc
  }, {} as Record<string, typeof games>)

  // Get current items (platforms or games)
  const currentItems = platform 
    ? (gamesByPlatform[platform] || [])
    : PLATFORMS

  // Reset focus when platform changes
  useEffect(() => {
    setFocusedIndex(0)
  }, [platform])

  // Track when we just navigated to this page to prevent auto-selection
  useEffect(() => {
    // If we're on /systems (not /systems/:platform), mark that we just navigated
    if (!platform && location.pathname === '/systems') {
      justNavigatedRef.current = true
      // Clear the flag after a short delay to allow user input
      const timer = setTimeout(() => {
        justNavigatedRef.current = false
      }, 300)
      return () => clearTimeout(timer)
    } else {
      justNavigatedRef.current = false
    }
  }, [location.pathname, platform])

  // Calculate columns for grid navigation
  const getColumns = useCallback(() => {
    // Match Tailwind breakpoints
    if (typeof window === 'undefined') return 6
    const width = window.innerWidth
    if (width >= 1536) return 6 // 2xl
    if (width >= 1280) return 6 // xl
    if (width >= 1024) return 5 // lg
    if (width >= 768) return 4  // md
    if (width >= 640) return 3   // sm
    return 2 // default
  }, [])

  // Handle gamepad navigation
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isSidebarFocused || currentItems.length === 0) return

    const columns = getColumns()
    const totalItems = currentItems.length
    let shouldMoveToSidebar = false
    let newIndex = focusedIndex

    if (platform) {
      // Navigating games grid
      switch (direction) {
        case 'left':
          if (focusedIndex % columns === 0) {
            shouldMoveToSidebar = true
          } else {
            newIndex = focusedIndex - 1
          }
          break
        case 'right':
          if ((focusedIndex + 1) % columns === 0 || focusedIndex === totalItems - 1) {
            newIndex = focusedIndex < totalItems - 1 ? focusedIndex + 1 : 0
          } else {
            newIndex = focusedIndex + 1
          }
          break
        case 'up':
          if (focusedIndex - columns >= 0) {
            newIndex = focusedIndex - columns
          } else {
            // At top - wrap to bottom row of same column
            const targetCol = focusedIndex % columns
            const rows = Math.ceil(totalItems / columns)
            const bottomRowIndex = (rows - 1) * columns + targetCol
            newIndex = Math.min(bottomRowIndex, totalItems - 1)
          }
          break
        case 'down':
          if (focusedIndex + columns < totalItems) {
            newIndex = focusedIndex + columns
          } else {
            const targetCol = focusedIndex % columns
            newIndex = Math.min(targetCol, totalItems - 1)
          }
          break
      }
    } else {
      // Navigating platforms grid
      switch (direction) {
        case 'left':
          if (focusedIndex % columns === 0) {
            shouldMoveToSidebar = true
          } else {
            newIndex = focusedIndex - 1
          }
          break
        case 'right':
          if ((focusedIndex + 1) % columns === 0 || focusedIndex === totalItems - 1) {
            newIndex = focusedIndex < totalItems - 1 ? focusedIndex + 1 : 0
          } else {
            newIndex = focusedIndex + 1
          }
          break
        case 'up':
          if (focusedIndex - columns >= 0) {
            newIndex = focusedIndex - columns
          } else {
            // At top - wrap to bottom row of same column
            const targetCol = focusedIndex % columns
            const rows = Math.ceil(totalItems / columns)
            const bottomRowIndex = (rows - 1) * columns + targetCol
            newIndex = Math.min(bottomRowIndex, totalItems - 1)
          }
          break
        case 'down':
          if (focusedIndex + columns < totalItems) {
            newIndex = focusedIndex + columns
          } else {
            const targetCol = focusedIndex % columns
            newIndex = Math.min(targetCol, totalItems - 1)
          }
          break
      }
    }

    // Update state separately to avoid render warnings
    if (shouldMoveToSidebar) {
      setIsSidebarFocused(true)
    } else {
      setFocusedIndex(Math.max(0, Math.min(newIndex, totalItems - 1)))
    }
  }, [isSidebarFocused, platform, currentItems.length, getColumns, focusedIndex, setIsSidebarFocused])

  const handleConfirm = useCallback(() => {
    if (isSidebarFocused || !currentItems[focusedIndex]) return
    
    // Prevent auto-navigation if we just navigated to this page
    if (!platform && justNavigatedRef.current) return

    if (platform) {
      // Navigate to game details
      const game = currentItems[focusedIndex] as typeof games[0]
      navigate(`/game/${game.id}`)
    } else {
      // Navigate to platform
      const platformItem = currentItems[focusedIndex] as typeof PLATFORMS[0]
      navigate(`/systems/${platformItem.id}`)
    }
  }, [isSidebarFocused, focusedIndex, currentItems, platform, navigate])

  const handleBack = useCallback(() => {
    if (isSidebarFocused) return
    if (platform) {
      // Go back to platforms list
      navigate('/systems')
    } else {
      // Return focus to sidebar
      setIsSidebarFocused(true)
    }
  }, [isSidebarFocused, platform, navigate, setIsSidebarFocused])

  // Gamepad navigation (only when page is focused)
  useGamepadNavigation({
    enabled: !isSidebarFocused,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  // If specific platform selected, show games for that platform
  if (platform) {
    const platformGames = gamesByPlatform[platform] || []
    const platformInfo = PLATFORMS.find(p => p.id === platform)

    return (
      <div className="h-full overflow-auto">
        <div className="px-6 py-4 border-b border-surface-800">
          <Link to="/systems" className="text-accent hover:underline text-sm mb-2 inline-block">
            ← All Systems
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {platform && (() => {
              const imgUrl = getPlatformImageUrl(platform)
              return imgUrl ? (
                <img
                  src={imgUrl}
                  alt={platformInfo?.name ?? platform}
                  className="h-8 w-auto object-contain"
                />
              ) : platformInfo?.icon ? (
                <span className="text-3xl" aria-label={platformInfo?.name ?? platform}>
                  {platformInfo.icon}
                </span>
              ) : null
            })()}
          </h1>
          <p className="text-surface-400">{platformGames.length} games</p>
        </div>

        <div className="p-6">
          {platformGames.length === 0 ? (
            <div className="text-center py-12 text-surface-400">
              No games found for this platform
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {platformGames.map((game, index) => (
                <div
                  key={game.id}
                  className={!isSidebarFocused && index === focusedIndex ? 'ring-2 ring-accent rounded-lg' : ''}
                >
                  <GameCard game={game} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show all platforms overview
  return (
    <div className="h-full overflow-auto">
      <div className="px-6 py-4 border-b border-surface-800">
        <h1 className="text-2xl font-bold">Systems</h1>
        <p className="text-surface-400">Browse games by platform</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {PLATFORMS.map((platformItem, index) => {
            const count = gamesByPlatform[platformItem.id]?.length || 0
            const imgUrl = getPlatformImageUrl(platformItem.id)
            const isFocused = !isSidebarFocused && index === focusedIndex
            return (
              <Link
                key={platformItem.id}
                to={`/systems/${platformItem.id}`}
                className={`bg-surface-800 hover:bg-surface-700 rounded-lg p-6 text-center transition-all flex flex-col items-center ${
                  isFocused ? 'ring-2 ring-accent scale-105' : ''
                }`}
              >
                <div className="mb-3 flex items-center justify-center">
                  {imgUrl ? (
                    <img src={imgUrl} alt={platformItem.name} className="h-8 w-auto object-contain" />
                  ) : (
                    <span className="text-4xl" aria-label={platformItem.name}>{platformItem.icon}</span>
                  )}
                </div>
                <p className="text-surface-400 text-sm">
                  {count} {count === 1 ? 'game' : 'games'}
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
