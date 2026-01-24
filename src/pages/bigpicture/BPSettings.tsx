import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Monitor, Gamepad2, Volume2, ArrowLeft } from 'lucide-react'
import { useInputStore } from '../../store/inputStore'
import { BPLayoutContext } from '../../components/bigpicture/BPLayout'
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation'
import { useGamepad } from '../../hooks/useGamepad'

interface SettingsSection {
  id: string
  label: string
  icon: React.ReactNode
}

const SECTIONS: SettingsSection[] = [
  { id: 'display', label: 'Display', icon: <Monitor size={24} /> },
  { id: 'controller', label: 'Controller', icon: <Gamepad2 size={24} /> },
  { id: 'audio', label: 'Audio', icon: <Volume2 size={24} /> }
]

export default function BPSettings() {
  const navigate = useNavigate()
  const { isNavFocused, setIsNavFocused } = useOutletContext<BPLayoutContext>()
  const { gamepads, activeGamepad } = useGamepad()
  const {
    bigPictureCardSize,
    setBigPictureCardSize,
    bigPictureOnStartup,
    setBigPictureOnStartup,
    analogDeadzone,
    setAnalogDeadzone
  } = useInputStore()

  const [selectedSection, setSelectedSection] = useState(0)
  const [selectedItem, setSelectedItem] = useState(0)
  const [isSectionFocused, setIsSectionFocused] = useState(true)

  const handleBack = useCallback(() => {
    if (!isSectionFocused) {
      setIsSectionFocused(true)
    } else {
      // Navigate back to library
      navigate('/bigpicture')
    }
  }, [isSectionFocused, navigate])

  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isSectionFocused) {
      // Navigate sections
      if (direction === 'up') {
        if (selectedSection === 0) {
          // At top of sections - go to nav tabs
          setIsNavFocused(true)
        } else {
          setSelectedSection(prev => prev - 1)
        }
      } else if (direction === 'down') {
        setSelectedSection(prev => Math.min(SECTIONS.length - 1, prev + 1))
      } else if (direction === 'right') {
        setIsSectionFocused(false)
        setSelectedItem(0)
      }
    } else {
      // Navigate items within section
      const itemCount = getItemCount(SECTIONS[selectedSection].id)
      if (direction === 'up') {
        if (selectedItem === 0) {
          // At top of items - go back to section list
          setIsSectionFocused(true)
        } else {
          setSelectedItem(prev => prev - 1)
        }
      } else if (direction === 'down') {
        setSelectedItem(prev => Math.min(itemCount - 1, prev + 1))
      } else if (direction === 'left') {
        setIsSectionFocused(true)
      }
    }
  }, [isSectionFocused, selectedSection, setIsNavFocused])

  const handleConfirm = useCallback(() => {
    if (isSectionFocused) {
      setIsSectionFocused(false)
      setSelectedItem(0)
    }
  }, [isSectionFocused])

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
        case 'ArrowUp':
          e.preventDefault()
          handleNavigate('up')
          break
        case 'ArrowDown':
          e.preventDefault()
          handleNavigate('down')
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleNavigate('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNavigate('right')
          break
        case 'Enter':
          e.preventDefault()
          handleConfirm()
          break
        case 'Escape':
          e.preventDefault()
          handleBack()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNavigate, handleConfirm, handleBack])

  const getItemCount = (sectionId: string): number => {
    switch (sectionId) {
      case 'display': return 2
      case 'controller': return 2
      case 'audio': return 1
      default: return 0
    }
  }

  const renderSectionContent = () => {
    const section = SECTIONS[selectedSection]

    switch (section.id) {
      case 'display':
        return (
          <div className="space-y-4">
            <SettingsItem
              label="Card Size"
              description="Size of game cards in the library"
              focused={!isSectionFocused && selectedItem === 0}
            >
              <select
                value={bigPictureCardSize}
                onChange={(e) => setBigPictureCardSize(e.target.value as 'small' | 'medium' | 'large')}
                className="bg-surface-700 border border-surface-600 rounded-lg px-4 py-2 text-lg"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </SettingsItem>

            <SettingsItem
              label="Start in Big Picture"
              description="Launch directly into Big Picture mode"
              focused={!isSectionFocused && selectedItem === 1}
            >
              <button
                onClick={() => setBigPictureOnStartup(!bigPictureOnStartup)}
                className={`w-14 h-8 rounded-full transition-colors ${
                  bigPictureOnStartup ? 'bg-accent' : 'bg-surface-600'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-transform ${
                    bigPictureOnStartup ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </SettingsItem>
          </div>
        )

      case 'controller':
        return (
          <div className="space-y-4">
            <SettingsItem
              label="Connected Controllers"
              description={gamepads.length > 0 ? `${gamepads.length} controller(s) detected` : 'No controllers connected'}
              focused={!isSectionFocused && selectedItem === 0}
            >
              {activeGamepad ? (
                <span className="text-accent">{activeGamepad.name}</span>
              ) : (
                <span className="text-surface-400">None</span>
              )}
            </SettingsItem>

            <SettingsItem
              label="Analog Deadzone"
              description="Stick movement threshold"
              focused={!isSectionFocused && selectedItem === 1}
            >
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={analogDeadzone * 100}
                  onChange={(e) => setAnalogDeadzone(parseInt(e.target.value) / 100)}
                  className="w-32 accent-accent"
                />
                <span className="text-lg w-12">{(analogDeadzone * 100).toFixed(0)}%</span>
              </div>
            </SettingsItem>
          </div>
        )

      case 'audio':
        return (
          <div className="space-y-4">
            <SettingsItem
              label="Audio Settings"
              description="Audio is controlled by your system and emulator settings"
              focused={!isSectionFocused && selectedItem === 0}
            >
              <span className="text-surface-400">System Default</span>
            </SettingsItem>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full flex">
      {/* Section List */}
      <div className="w-80 bg-surface-900/50 border-r border-surface-800 p-4">
        <div className="space-y-2">
          {SECTIONS.map((section, index) => (
            <button
              key={section.id}
              onClick={() => {
                setSelectedSection(index)
                setIsSectionFocused(true)
              }}
              className={`w-full flex items-center gap-4 p-4 rounded-xl text-left text-lg transition-all ${
                selectedSection === index && isSectionFocused
                  ? 'bg-accent scale-105 shadow-lg bp-focus'
                  : selectedSection === index
                  ? 'bg-surface-700'
                  : 'hover:bg-surface-800'
              }`}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}

          {/* Back button - mouse only, B button also works */}
          <button
            onClick={() => navigate('/bigpicture')}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-left text-lg hover:bg-surface-800 mt-8 text-surface-400"
          >
            <ArrowLeft size={24} />
            <span>Back to Library</span>
          </button>
        </div>
      </div>

      {/* Section Content */}
      <div className="flex-1 p-8 overflow-auto">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          {SECTIONS[selectedSection].icon}
          {SECTIONS[selectedSection].label}
        </h2>

        {renderSectionContent()}
      </div>
    </div>
  )
}

interface SettingsItemProps {
  label: string
  description: string
  focused: boolean
  children: React.ReactNode
}

function SettingsItem({ label, description, focused, children }: SettingsItemProps) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl transition-all ${
        focused ? 'bg-surface-700 scale-[1.02] shadow-lg bp-focus' : 'bg-surface-800'
      }`}
    >
      <div>
        <h3 className="font-medium text-lg">{label}</h3>
        <p className="text-surface-400">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}
