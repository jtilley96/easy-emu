import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Library, Monitor, Settings, X } from 'lucide-react'
import { useInputStore } from '../../store/inputStore'
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation'
import BPControllerHints from './BPControllerHints'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'library', label: 'Library', icon: <Library size={24} />, path: '/bigpicture' },
  { id: 'systems', label: 'Systems', icon: <Monitor size={24} />, path: '/bigpicture/systems' },
  { id: 'settings', label: 'Settings', icon: <Settings size={24} />, path: '/bigpicture/settings' }
]

export default function BPLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setBigPictureMode } = useInputStore()
  const [focusedNavIndex, setFocusedNavIndex] = useState(0)
  const [isNavFocused, setIsNavFocused] = useState(true)  // Start focused on nav

  // Determine current nav item based on location
  useEffect(() => {
    const currentIndex = NAV_ITEMS.findIndex(item => {
      if (item.path === '/bigpicture') {
        return location.pathname === '/bigpicture' || location.pathname.startsWith('/bigpicture/game/')
      }
      return location.pathname.startsWith(item.path)
    })
    if (currentIndex >= 0) {
      setFocusedNavIndex(currentIndex)
    }
  }, [location.pathname])

  const handleExitBigPicture = useCallback(() => {
    setBigPictureMode(false)
    navigate('/')
  }, [setBigPictureMode, navigate])

  const handleNavNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!isNavFocused) return

    if (direction === 'left') {
      setFocusedNavIndex(prev => Math.max(0, prev - 1))
    } else if (direction === 'right') {
      setFocusedNavIndex(prev => Math.min(NAV_ITEMS.length - 1, prev + 1))
    } else if (direction === 'down') {
      setIsNavFocused(false)
    }
  }, [isNavFocused])

  const handleNavConfirm = useCallback(() => {
    if (isNavFocused) {
      navigate(NAV_ITEMS[focusedNavIndex].path)
      // Move focus to page content after selecting a tab
      setIsNavFocused(false)
    }
  }, [isNavFocused, focusedNavIndex, navigate])

  // Gamepad navigation for top nav
  useGamepadNavigation({
    enabled: isNavFocused,
    onNavigate: handleNavNavigate,
    onConfirm: handleNavConfirm,
    onBack: handleExitBigPicture
  })

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNavFocused) {
          handleExitBigPicture()
        } else {
          setIsNavFocused(true)
        }
      }

      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        handleExitBigPicture()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isNavFocused, handleExitBigPicture])

  return (
    <div className="h-screen w-screen bg-surface-950 flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="flex-shrink-0 bg-surface-900/90 backdrop-blur-lg border-b border-surface-800">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold">E</span>
            </div>
            <span className="text-xl font-semibold">EasyEmu</span>
          </div>

          {/* Nav Items */}
          <div className="flex items-center gap-2">
            {NAV_ITEMS.map((item, index) => {
              const isActive = index === focusedNavIndex && isNavFocused
              const isCurrent = location.pathname === item.path ||
                (item.path === '/bigpicture' && location.pathname.startsWith('/bigpicture/game/'))

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setFocusedNavIndex(index)
                    navigate(item.path)
                    setIsNavFocused(false)  // Move focus to page content
                  }}
                  onFocus={() => {
                    setFocusedNavIndex(index)
                    setIsNavFocused(true)
                  }}
                  className={`flex items-center gap-3 px-6 py-3 rounded-lg text-lg transition-all ${
                    isActive
                      ? 'bg-accent text-white scale-105 shadow-lg bp-focus'
                      : isCurrent
                      ? 'bg-surface-700 text-white'
                      : 'hover:bg-surface-800 text-surface-300'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          {/* Exit Button */}
          <button
            onClick={handleExitBigPicture}
            className="p-3 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white transition-colors"
            title="Exit Big Picture Mode (Tab)"
          >
            <X size={24} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet context={{ isNavFocused, setIsNavFocused }} />
      </main>

      {/* Controller Hints Bar */}
      <BPControllerHints
        hints={[
          { button: 'A', label: 'Select' },
          { button: 'B', label: 'Back' },
          { button: 'Y', label: 'Favorite' },
          { button: 'LB/RB', label: 'Tabs' }
        ]}
      />
    </div>
  )
}

// Export context type for child routes
export interface BPLayoutContext {
  isNavFocused: boolean
  setIsNavFocused: (focused: boolean) => void
}
