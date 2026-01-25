import { useState, useCallback, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Library,
  Gamepad2,
  Settings,
  Clock,
  Star,
  FolderOpen
} from 'lucide-react'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import { useLayoutContext } from './Layout'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: <Library size={20} />, label: 'Library' },
  { to: '/systems', icon: <FolderOpen size={20} />, label: 'Systems' },
  { to: '/?filter=recent', icon: <Clock size={20} />, label: 'Recently Played' },
  { to: '/?filter=favorites', icon: <Star size={20} />, label: 'Favorites' },
  { to: '/settings', icon: <Settings size={20} />, label: 'Settings' }
]

function NavItemComponent({ item, isActive, isFocused }: { item: NavItem; isActive: boolean; isFocused: boolean }) {
  return (
    <NavLink
      to={item.to}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
        isActive
          ? 'bg-accent text-white'
          : isFocused
          ? 'bg-surface-800 text-white scale-[1.02] shadow-lg bp-focus'
          : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100'
      }`}
    >
      {item.icon}
      <span className="font-medium">{item.label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [focusedIndex, setFocusedIndex] = useState(0)
  const { isSidebarFocused, setIsSidebarFocused } = useLayoutContext()

  // Helper function to determine if a nav item is active
  const isItemActive = useCallback((item: NavItem): boolean => {
    const { pathname, search } = location
    
    // Parse query params
    const searchParams = new URLSearchParams(search)
    const filter = searchParams.get('filter')
    
    // Library: active when pathname is '/' and no filter (or filter is not recent/favorites)
    if (item.to === '/') {
      return pathname === '/' && filter !== 'recent' && filter !== 'favorites'
    }
    
    // Systems: active when pathname starts with '/systems'
    if (item.to === '/systems') {
      return pathname.startsWith('/systems')
    }
    
    // Recently Played: active when pathname is '/' and filter is 'recent'
    if (item.to === '/?filter=recent') {
      return pathname === '/' && filter === 'recent'
    }
    
    // Favorites: active when pathname is '/' and filter is 'favorites'
    if (item.to === '/?filter=favorites') {
      return pathname === '/' && filter === 'favorites'
    }
    
    // Settings: active when pathname starts with '/settings'
    if (item.to === '/settings') {
      return pathname.startsWith('/settings')
    }
    
    return false
  }, [location])

  // Update focused index based on current route
  useEffect(() => {
    const currentIndex = NAV_ITEMS.findIndex(item => isItemActive(item))
    if (currentIndex >= 0) {
      setFocusedIndex(currentIndex)
    }
  }, [location.pathname, location.search, isItemActive])

  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!isSidebarFocused) return

    if (direction === 'up') {
      setFocusedIndex(prev => Math.max(0, prev - 1))
    } else if (direction === 'down') {
      setFocusedIndex(prev => Math.min(NAV_ITEMS.length - 1, prev + 1))
    } else if (direction === 'right') {
      // Move focus to page content
      setIsSidebarFocused(false)
    }
  }, [isSidebarFocused, setIsSidebarFocused])

  const handleConfirm = useCallback(() => {
    if (!isSidebarFocused) return
    const item = NAV_ITEMS[focusedIndex]
    if (item) {
      navigate(item.to)
      // Move focus to page content after navigation
      setIsSidebarFocused(false)
    }
  }, [focusedIndex, navigate, isSidebarFocused, setIsSidebarFocused])

  const handleBack = useCallback(() => {
    if (!isSidebarFocused) {
      // If page is focused, move focus back to sidebar
      setIsSidebarFocused(true)
    }
  }, [isSidebarFocused, setIsSidebarFocused])

  // Gamepad navigation (only when sidebar is focused)
  useGamepadNavigation({
    enabled: isSidebarFocused,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  return (
    <aside className="w-56 bg-surface-950 border-r border-surface-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
            <Gamepad2 size={24} />
          </div>
          <span className="text-xl font-bold">EasyEmu</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.slice(0, 2).map((item, index) => {
          return (
            <NavItemComponent
              key={item.to}
              item={item}
              isActive={isItemActive(item)}
              isFocused={focusedIndex === index}
            />
          )
        })}

        <div className="pt-4 pb-2">
          <span className="px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">
            Quick Access
          </span>
        </div>

        {NAV_ITEMS.slice(2, 4).map((item, index) => {
          const actualIndex = index + 2
          return (
            <NavItemComponent
              key={item.to}
              item={item}
              isActive={isItemActive(item)}
              isFocused={focusedIndex === actualIndex}
            />
          )
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="p-3 border-t border-surface-800">
        {NAV_ITEMS.slice(4).map((item, index) => {
          const actualIndex = index + 4
          return (
            <NavItemComponent
              key={item.to}
              item={item}
              isActive={isItemActive(item)}
              isFocused={focusedIndex === actualIndex}
            />
          )
        })}
      </div>
    </aside>
  )
}
