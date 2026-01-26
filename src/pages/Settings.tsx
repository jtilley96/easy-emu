import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  HardDrive,
  Gamepad2,
  Database,
  Download,
  Sliders,
  Info,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  AlertCircle,
  Loader2,
  Settings2,
  XCircle,
  Cpu
} from 'lucide-react'
import { PLATFORMS } from '../constants/platforms'
import { useAppStore } from '../store/appStore'
import { useLibraryStore } from '../store/libraryStore'
import { useUIStore } from '../store/uiStore'
import CoreManagerSection from '../components/settings/CoreManagerSection'
import ControllersSettings from '../components/settings/ControllersSettings'
import { EmulatorInfo, UpdateInfo, UpdateDownloadProgress } from '../types'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import { useLayoutContext } from '../components/Layout'
import { SettingsSectionProps } from '../types'

interface BiosStatus {
  id: string
  name: string
  description: string
  platform: string
  required: boolean
  found: boolean
  path: string | null
}

type SettingsSection = 'library' | 'emulators' | 'cores' | 'bios' | 'paths' | 'metadata' | 'controllers' | 'general'

interface NavItem {
  id: SettingsSection
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { id: 'library', label: 'Library', icon: <FolderOpen size={18} /> },
  { id: 'emulators', label: 'Emulators', icon: <Gamepad2 size={18} /> },
  { id: 'cores', label: 'Embedded Cores', icon: <Cpu size={18} /> },
  { id: 'bios', label: 'BIOS Files', icon: <HardDrive size={18} /> },
  { id: 'paths', label: 'Paths', icon: <Database size={18} /> },
  { id: 'metadata', label: 'Metadata', icon: <Download size={18} /> },
  { id: 'controllers', label: 'Controllers', icon: <Sliders size={18} /> },
  { id: 'general', label: 'General', icon: <Info size={18} /> }
]

export default function Settings() {
  const { section } = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const currentSection = (section as SettingsSection) || 'library'
  const { isSidebarFocused, setIsSidebarFocused } = useLayoutContext()
  const [focusedSectionIndex, setFocusedSectionIndex] = useState(0)
  const [isSectionListFocused, setIsSectionListFocused] = useState(true)
  
  // Prevent A button from firing immediately after navigation or focus change
  const justActivatedRef = useRef(true)
  const contentJustActivatedRef = useRef(true)
  
  // Reset activation guard when sidebar focus changes
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
  
  // Reset content activation guard when section list focus changes
  useEffect(() => {
    if (isSectionListFocused) {
      // Content lost focus - set guard for when it regains focus
      contentJustActivatedRef.current = true
    } else {
      // Content gained focus - clear guard after short delay
      const timeout = setTimeout(() => {
        contentJustActivatedRef.current = false
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [isSectionListFocused])
  
  // Content area gamepad state - grid based (row, col)
  const [focusedRow, setFocusedRow] = useState(0)
  const [focusedCol, setFocusedCol] = useState(0)
  // Grid structure: { rows: number, cols: number[] } - cols[row] = number of columns in that row
  const [_contentGrid, setContentGrid] = useState<{ rows: number; cols: number[] }>({ rows: 0, cols: [] })
  const contentScrollRef = useRef<HTMLDivElement>(null)

  // Update focused section index based on current route
  useEffect(() => {
    const currentIndex = NAV_ITEMS.findIndex(item => item.id === currentSection)
    if (currentIndex >= 0) {
      setFocusedSectionIndex(currentIndex)
    }
  }, [currentSection])

  // Reset content focus and scroll when section changes
  useEffect(() => {
    setFocusedRow(0)
    setFocusedCol(0)
    // Scroll content to top
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentSection])

  // Auto-scroll to focused content item
  useEffect(() => {
    if (!isSectionListFocused && contentScrollRef.current) {
      const focusedElement = contentScrollRef.current.querySelector(`[data-focus-row="${focusedRow}"][data-focus-col="${focusedCol}"]`)
      if (focusedElement) {
        const container = contentScrollRef.current
        const elementRect = focusedElement.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        
        // Calculate desired position (~30% from top for lookahead)
        const targetTop = containerRect.top + containerRect.height * 0.3
        const offset = elementRect.top - targetTop
        
        if (Math.abs(offset) > 50) {
          container.scrollTo({
            top: container.scrollTop + offset,
            behavior: 'smooth'
          })
        }
      }
    }
  }, [focusedRow, focusedCol, isSectionListFocused])

  // Helper to enter content area
  const enterContentArea = useCallback(() => {
    setIsSectionListFocused(false)
    setFocusedRow(0)
    setFocusedCol(0)
  }, [])

  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isSidebarFocused) return

    if (isSectionListFocused) {
      // Navigate settings section tabs
      if (direction === 'up') {
        if (focusedSectionIndex === 0) {
          // At top - return focus to main sidebar
          setIsSidebarFocused(true)
        } else {
          // Move up and immediately show that section's content
          const newIndex = focusedSectionIndex - 1
          setFocusedSectionIndex(newIndex)
          navigate(`/settings/${NAV_ITEMS[newIndex].id}`, { replace: true })
        }
      } else if (direction === 'down') {
        if (focusedSectionIndex < NAV_ITEMS.length - 1) {
          // Move down and immediately show that section's content
          const newIndex = focusedSectionIndex + 1
          setFocusedSectionIndex(newIndex)
          navigate(`/settings/${NAV_ITEMS[newIndex].id}`, { replace: true })
        }
      } else if (direction === 'left') {
        // Return focus to main sidebar
        setIsSidebarFocused(true)
      } else if (direction === 'right') {
        // Enter content area
        enterContentArea()
      }
    }
    // Content area navigation is handled by each section
  }, [isSidebarFocused, isSectionListFocused, focusedSectionIndex, setIsSidebarFocused, navigate, enterContentArea])

  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return
    if (isSidebarFocused) return
    if (isSectionListFocused) {
      // Enter content area (section is already showing)
      enterContentArea()
    }
    // Content area confirmation is handled by each section
  }, [isSidebarFocused, isSectionListFocused, enterContentArea])

  const handleBack = useCallback(() => {
    if (isSidebarFocused) return
    if (isSectionListFocused) {
      setIsSidebarFocused(true)
    } else {
      setIsSectionListFocused(true)
    }
  }, [isSidebarFocused, isSectionListFocused, setIsSidebarFocused])

  // Gamepad navigation for section list only
  useGamepadNavigation({
    enabled: !isSidebarFocused && isSectionListFocused,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  // Section props for content gamepad navigation
  const sectionProps: SettingsSectionProps = {
    isFocused: !isSidebarFocused && !isSectionListFocused,
    focusedRow,
    focusedCol,
    onFocusChange: (row: number, col: number) => {
      setFocusedRow(row)
      setFocusedCol(col)
    },
    onGridChange: setContentGrid,
    onBack: () => setIsSectionListFocused(true),
    justActivatedRef: contentJustActivatedRef,
    scrollRef: contentScrollRef as React.RefObject<HTMLElement>
  }

  return (
    <div className="flex h-full">
      {/* Settings Navigation */}
      <nav className={`w-56 bg-surface-900 border-r p-4 transition-all relative ${
        !isSidebarFocused && isSectionListFocused
          ? 'border-accent/50'
          : 'border-surface-800'
      }`}>
        {/* Focus indicator bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-accent transition-opacity ${
          !isSidebarFocused && isSectionListFocused ? 'opacity-100' : 'opacity-0'
        }`} />

        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item, index) => {
            const isActive = currentSection === item.id
            const isFocused = !isSidebarFocused && isSectionListFocused && index === focusedSectionIndex
            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(`/settings/${item.id}`)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                    isActive
                      ? isFocused
                        ? 'bg-accent text-white ring-2 ring-white/70 scale-[1.02] shadow-lg'
                        : 'bg-accent text-white'
                      : isFocused
                      ? 'bg-surface-800 text-white scale-[1.02] shadow-lg ring-2 ring-accent'
                      : 'hover:bg-surface-800 text-surface-300'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Settings Content */}
      <div ref={contentScrollRef} className="flex-1 overflow-auto p-6">
        {currentSection === 'library' && <LibrarySettings {...sectionProps} />}
        {currentSection === 'emulators' && <EmulatorsSettings {...sectionProps} />}
        {currentSection === 'cores' && <CoreManagerSection {...sectionProps} />}
        {currentSection === 'bios' && <BiosSettings {...sectionProps} />}
        {currentSection === 'paths' && <PathsSettings {...sectionProps} />}
        {currentSection === 'metadata' && <MetadataSettings {...sectionProps} />}
        {currentSection === 'controllers' && <ControllersSettings {...sectionProps} />}
        {currentSection === 'general' && <GeneralSettings {...sectionProps} />}
      </div>
    </div>
  )
}

// Library Settings Section
function LibrarySettings({ isFocused, focusedRow, focusedCol, onFocusChange, onGridChange, onBack, justActivatedRef, scrollRef }: SettingsSectionProps) {
  const { romFolders, addRomFolder, removeRomFolder, scanLibrary, isScanning } = useLibraryStore()
  const { addToast } = useUIStore()

  // Grid layout:
  // Row 0 to N-1: ROM folders - each has [Open(0), Remove(1)]
  // Row N: Action buttons - [Add Folder(0), Rescan(1)] or just [Add Folder(0)]
  const actionRowCols = romFolders.length > 0 ? 2 : 1
  const grid = {
    rows: romFolders.length + 1,
    cols: [...romFolders.map(() => 2), actionRowCols]
  }

  useEffect(() => {
    onGridChange(grid)
  }, [romFolders.length, onGridChange])

  const handleAddFolder = async () => {
    const defaultPath = romFolders.length > 0 ? romFolders[romFolders.length - 1] : undefined
    const path = await window.electronAPI.dialog.openDirectory(defaultPath)
    if (path) {
      addRomFolder(path)
      addToast('success', `Added folder: ${path}`)
    }
  }

  const handleScan = async () => {
    await scanLibrary()
    addToast('success', 'Library scan complete')
  }

  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return
    
    const actionRowIndex = romFolders.length
    
    if (focusedRow < actionRowIndex) {
      // Folder row
      const folder = romFolders[focusedRow]
      if (focusedCol === 0) {
        window.electronAPI.shell.openPath(folder)
      } else if (focusedCol === 1) {
        removeRomFolder(folder)
        addToast('info', 'Folder removed')
        // Adjust focus if we removed a row
        if (focusedRow >= romFolders.length - 1 && focusedRow > 0) {
          onFocusChange(focusedRow - 1, 0)
        }
      }
    } else {
      // Action row
      if (focusedCol === 0) {
        handleAddFolder()
      } else if (focusedCol === 1 && romFolders.length > 0) {
        handleScan()
      }
    }
  }, [focusedRow, focusedCol, romFolders, removeRomFolder, addToast, onFocusChange, justActivatedRef])

  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const maxRow = grid.rows - 1
    const maxColInRow = grid.cols[focusedRow] - 1

    if (direction === 'up') {
      if (focusedRow === 0) {
        onBack()
      } else {
        // Move up, clamp column to new row's max
        const newRow = focusedRow - 1
        const newMaxCol = grid.cols[newRow] - 1
        onFocusChange(newRow, Math.min(focusedCol, newMaxCol))
      }
    } else if (direction === 'down') {
      if (focusedRow < maxRow) {
        const newRow = focusedRow + 1
        const newMaxCol = grid.cols[newRow] - 1
        onFocusChange(newRow, Math.min(focusedCol, newMaxCol))
      }
    } else if (direction === 'left') {
      if (focusedCol > 0) {
        onFocusChange(focusedRow, focusedCol - 1)
      } else {
        onBack()
      }
    } else if (direction === 'right') {
      if (focusedCol < maxColInRow) {
        onFocusChange(focusedRow, focusedCol + 1)
      }
    }
  }, [focusedRow, focusedCol, grid, onFocusChange, onBack])

  useGamepadNavigation({
    enabled: isFocused,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack,
    scrollRef
  })

  // Helper to check if a cell is focused
  const isCellFocused = (row: number, col: number) => {
    return isFocused && focusedRow === row && focusedCol === col
  }

  const actionRowIndex = romFolders.length

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Library Settings</h2>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">ROM Folders</h3>
        <p className="text-surface-400 mb-4">
          Add folders containing your game ROMs. EasyEmu will scan these folders to build your library.
        </p>

        <div className="space-y-2 mb-4">
          {romFolders.length === 0 ? (
            <div className="bg-surface-800 rounded-lg p-4 text-center text-surface-400">
              No folders added yet
            </div>
          ) : (
            romFolders.map((folder, rowIndex) => (
              <div
                key={folder}
                className="flex items-center justify-between bg-surface-800 rounded-lg px-4 py-3"
              >
                <span className="font-mono text-sm truncate flex-1">{folder}</span>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    data-focus-row={rowIndex}
                    data-focus-col={0}
                    onClick={() => window.electronAPI.shell.openPath(folder)}
                    className={`p-2 rounded transition-all ${
                      isCellFocused(rowIndex, 0)
                        ? 'bg-accent text-white ring-2 ring-accent scale-105'
                        : 'hover:bg-surface-700'
                    }`}
                    title="Open folder"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    data-focus-row={rowIndex}
                    data-focus-col={1}
                    onClick={() => {
                      removeRomFolder(folder)
                      addToast('info', 'Folder removed')
                    }}
                    className={`p-2 rounded transition-all ${
                      isCellFocused(rowIndex, 1)
                        ? 'bg-red-500 text-white ring-2 ring-red-400 scale-105'
                        : 'hover:bg-red-500/20 text-red-400'
                    }`}
                    title="Remove folder"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-3">
          <button
            data-focus-row={actionRowIndex}
            data-focus-col={0}
            onClick={handleAddFolder}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isCellFocused(actionRowIndex, 0)
                ? 'bg-accent text-white ring-2 ring-accent scale-105'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            <Plus size={18} />
            Add Folder
          </button>
          {romFolders.length > 0 && (
            <button
              data-focus-row={actionRowIndex}
              data-focus-col={1}
              onClick={handleScan}
              disabled={isScanning || romFolders.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                isCellFocused(actionRowIndex, 1)
                  ? 'bg-accent text-white ring-2 ring-accent scale-105'
                  : 'bg-surface-700 hover:bg-surface-600'
              }`}
            >
              <RefreshCw size={18} className={isScanning ? 'spinner' : ''} />
              {isScanning ? 'Scanning...' : 'Rescan Library'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

// Emulators Settings Section
function EmulatorsSettings({ isFocused, focusedRow, focusedCol, onFocusChange, onGridChange, onBack, justActivatedRef, scrollRef }: SettingsSectionProps) {
  const [emulators, setEmulators] = useState<EmulatorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [versionCache, setVersionCache] = useState<Record<string, string>>({})
  const [defaults, setDefaults] = useState<Record<string, string>>({})
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const { addToast } = useUIStore()
  const refreshPlatformsWithEmulator = useLibraryStore(s => s.refreshPlatformsWithEmulator)
  
  // Platform selector dropdown state
  const [openPlatformId, setOpenPlatformId] = useState<string | null>(null)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)
  
  // Platform grid layout - 3 columns on large screens
  const PLATFORM_GRID_COLS = 3
  const platformCount = PLATFORMS.length

  // Navigation layout (using row for section, col for position within section):
  // Row 0: Platform grid (col = platform index within grid) - NES is first
  // Row 1 to N: Emulator cards (col = button index within card)
  // Row N+1: Re-detect button (at the end)
  const emulatorStartRow = 1
  const redetectRow = emulatorStartRow + emulators.length
  const itemCount = redetectRow + 1

  useEffect(() => {
    // Col count: row 0 = platformCount, row 1 to N = 1 each (emulators), last row = 1 (redetect)
    const cols = [platformCount, ...Array(emulators.length).fill(1), 1]
    onGridChange({ rows: itemCount, cols })
  }, [itemCount, platformCount, emulators.length, onGridChange])

  // Get current section info
  const getCurrentSection = () => {
    if (focusedRow === 0) return 'platforms'
    if (focusedRow === redetectRow) return 'redetect'
    return 'emulators'
  }

  const currentSection = getCurrentSection()
  const focusedPlatformIndex = currentSection === 'platforms' ? focusedCol : -1
  const focusedEmulatorIndex = currentSection === 'emulators' ? focusedRow - emulatorStartRow : -1
  const focusedEmulator = focusedEmulatorIndex >= 0 ? emulators[focusedEmulatorIndex] : null
  
  // Check if we're in dropdown selection mode
  const isDropdownOpen = openPlatformId !== null

  const loadEmulators = async () => {
    setLoading(true)
    try {
      const results = await window.electronAPI.emulators.detect()
      setEmulators(results)
    } catch (error) {
      console.error('Failed to detect emulators:', error)
      addToast('error', 'Failed to detect emulators')
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      const config = (await window.electronAPI.config.getAll()) as Record<string, unknown>
      setDefaults((config.defaultEmulatorPerPlatform as Record<string, string>) || {})
      setEnabled((config.emulatorEnabled as Record<string, boolean>) || {})
    } catch (e) {
      console.error('Failed to load config', e)
    }
  }

  useEffect(() => {
    loadEmulators()
    loadConfig()
  }, [])

  useEffect(() => {
    emulators.filter(e => e.installed).forEach(emu => {
      if (versionCache[emu.id] !== undefined) return
      window.electronAPI.emulators.getVersion(emu.id).then(v => {
        setVersionCache(prev => ({ ...prev, [emu.id]: v }))
      })
    })
  }, [emulators, versionCache])

  const handleBrowse = async (emulatorId: string) => {
    const path = await window.electronAPI.dialog.openFile([
      { name: 'Executable', extensions: ['exe', 'app', ''] }
    ])
    if (path) {
      await window.electronAPI.emulators.configure(emulatorId, { path })
      await loadEmulators()
      await refreshPlatformsWithEmulator()
      setVersionCache(prev => {
        const next = { ...prev }
        delete next[emulatorId]
        return next
      })
      addToast('success', 'Emulator path updated')
    }
  }

  const handleClear = async (emulatorId: string) => {
    await window.electronAPI.emulators.configure(emulatorId, { clear: true })
    await loadEmulators()
    await refreshPlatformsWithEmulator()
    setVersionCache(prev => {
      const next = { ...prev }
      delete next[emulatorId]
      return next
    })
    addToast('success', 'Path cleared')
  }

  const handleDownload = (url: string) => {
    window.electronAPI.shell.openExternal(url)
  }

  const handleEnabledChange = async (emulatorId: string, value: boolean) => {
    const next = { ...enabled, [emulatorId]: value }
    setEnabled(next)
    await window.electronAPI.config.set('emulatorEnabled', next)
    await refreshPlatformsWithEmulator()
    addToast('success', value ? 'Emulator enabled' : 'Emulator disabled')
  }

  const handleOpenSettings = async (emulatorId: string) => {
    try {
      await window.electronAPI.emulators.openSettings(emulatorId)
    } catch (e) {
      addToast('error', 'Failed to open emulator settings')
    }
  }

  const handleDefaultChange = async (platformId: string, emulatorId: string) => {
    const value = emulatorId === '' ? undefined : emulatorId
    const next = value ? { ...defaults, [platformId]: value } : (() => {
      const o = { ...defaults }
      delete o[platformId]
      return o
    })()
    setDefaults(next)
    await window.electronAPI.config.set('defaultEmulatorPerPlatform', next)
    addToast('success', 'Default emulator updated')
  }

  const getPlatformNames = (platforms: string[]): string => {
    return platforms.map(p => PLATFORMS.find(x => x.id === p)?.shortName ?? p).join(', ')
  }

  const installedForPlatform = (platformId: string) =>
    emulators.filter(
      e => e.installed && (enabled[e.id] !== false) && e.platforms.includes(platformId)
    )

  // Helper to check if a section/item is focused
  const isRedetectFocused = () => isFocused && focusedRow === redetectRow && !isDropdownOpen
  const isPlatformFocused = (platformIndex: number) => isFocused && focusedRow === 0 && focusedCol === platformIndex && !isDropdownOpen
  const isEmulatorFocused = (emulatorIndex: number) => isFocused && focusedRow === emulatorStartRow + emulatorIndex && !isDropdownOpen
  const isEmulatorButtonFocused = (emulatorIndex: number, buttonIndex: number) => 
    isEmulatorFocused(emulatorIndex) && focusedCol === buttonIndex
  
  // Get available buttons for an emulator (returns array of button types)
  const getEmulatorButtons = useCallback((emu: EmulatorInfo): ('browse' | 'clear' | 'settings' | 'download')[] => {
    const buttons: ('browse' | 'clear' | 'settings' | 'download')[] = ['browse']
    if (emu.path) buttons.push('clear')
    if (emu.installed) buttons.push('settings')
    if (!emu.installed && emu.downloadUrl) buttons.push('download')
    return buttons
  }, [])

  // Get options for a platform (with "Default" as first option)
  const getOptionsForPlatform = useCallback((platformId: string) => {
    const emus = installedForPlatform(platformId)
    return [
      { id: '', name: 'Default (first installed)' },
      ...emus.map(e => ({ id: e.id, name: e.name }))
    ]
  }, [emulators, enabled])

  // Open dropdown for a platform
  const openDropdown = useCallback((platformId: string) => {
    const options = getOptionsForPlatform(platformId)
    const currentValue = defaults[platformId] ?? ''
    const currentIndex = options.findIndex(o => o.id === currentValue)
    setOpenPlatformId(platformId)
    setSelectedOptionIndex(currentIndex >= 0 ? currentIndex : 0)
  }, [defaults, getOptionsForPlatform])

  // Close dropdown without saving
  const closeDropdown = useCallback(() => {
    setOpenPlatformId(null)
    setSelectedOptionIndex(0)
  }, [])

  // Confirm dropdown selection
  const confirmDropdownSelection = useCallback(() => {
    if (!openPlatformId) return
    const options = getOptionsForPlatform(openPlatformId)
    const selectedOption = options[selectedOptionIndex]
    if (selectedOption) {
      handleDefaultChange(openPlatformId, selectedOption.id)
    }
    closeDropdown()
  }, [openPlatformId, selectedOptionIndex, getOptionsForPlatform, closeDropdown])

  // Handle gamepad confirmation
  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return
    
    // If dropdown is open, confirm selection
    if (isDropdownOpen) {
      confirmDropdownSelection()
      return
    }
    
    if (currentSection === 'redetect') {
      loadEmulators()
      loadConfig()
      refreshPlatformsWithEmulator()
    } else if (currentSection === 'platforms') {
      const platform = PLATFORMS[focusedPlatformIndex]
      if (platform) {
        openDropdown(platform.id)
      }
    } else if (focusedEmulator) {
      // Get the buttons for this emulator and execute the focused one
      const buttons = getEmulatorButtons(focusedEmulator)
      const buttonType = buttons[focusedCol] || 'browse'
      
      switch (buttonType) {
        case 'browse':
          handleBrowse(focusedEmulator.id)
          break
        case 'clear':
          handleClear(focusedEmulator.id)
          break
        case 'settings':
          handleOpenSettings(focusedEmulator.id)
          break
        case 'download':
          if (focusedEmulator.downloadUrl) {
            handleDownload(focusedEmulator.downloadUrl)
          }
          break
      }
    }
  }, [currentSection, focusedPlatformIndex, focusedEmulator, focusedCol, refreshPlatformsWithEmulator, justActivatedRef, isDropdownOpen, confirmDropdownSelection, openDropdown, getEmulatorButtons])

  // Handle back button
  const handleBackButton = useCallback(() => {
    if (isDropdownOpen) {
      closeDropdown()
    } else {
      onBack()
    }
  }, [isDropdownOpen, closeDropdown, onBack])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isFocused,
    onNavigate: (direction) => {
      // If dropdown is open, navigate within dropdown
      if (isDropdownOpen && openPlatformId) {
        const options = getOptionsForPlatform(openPlatformId)
        if (direction === 'up') {
          setSelectedOptionIndex(prev => Math.max(0, prev - 1))
        } else if (direction === 'down') {
          setSelectedOptionIndex(prev => Math.min(options.length - 1, prev + 1))
        }
        return
      }
      
      // Grid navigation for platforms section (row 0)
      if (currentSection === 'platforms') {
        const currentGridRow = Math.floor(focusedCol / PLATFORM_GRID_COLS)
        const currentGridCol = focusedCol % PLATFORM_GRID_COLS

        if (direction === 'up') {
          if (currentGridRow === 0) {
            // At top of platforms - go back to section list
            onBack()
          } else {
            // Move up one row in grid
            const newIndex = (currentGridRow - 1) * PLATFORM_GRID_COLS + currentGridCol
            onFocusChange(0, Math.min(newIndex, platformCount - 1))
          }
        } else if (direction === 'down') {
          const newGridRow = currentGridRow + 1
          const newIndex = newGridRow * PLATFORM_GRID_COLS + currentGridCol
          if (newIndex < platformCount) {
            // Move down one row in grid
            onFocusChange(0, newIndex)
          } else {
            // Move to emulators section (or redetect if no emulators)
            if (emulators.length > 0) {
              onFocusChange(emulatorStartRow, 0)
            } else {
              onFocusChange(redetectRow, 0)
            }
          }
        } else if (direction === 'left') {
          if (currentGridCol === 0) {
            // At left edge - go back
            onBack()
          } else {
            // Move left in grid
            onFocusChange(0, focusedCol - 1)
          }
        } else if (direction === 'right') {
          if (focusedCol < platformCount - 1) {
            // Move right in grid
            onFocusChange(0, focusedCol + 1)
          }
        }
        return
      }

      // Emulator section navigation (with left/right for buttons)
      if (currentSection === 'emulators' && focusedEmulator) {
        const buttons = getEmulatorButtons(focusedEmulator)
        const maxCol = buttons.length - 1

        if (direction === 'up') {
          if (focusedRow === emulatorStartRow) {
            // From first emulator, go to last row of platform grid
            const lastPlatformIndex = platformCount - 1
            onFocusChange(0, lastPlatformIndex)
          } else {
            onFocusChange(focusedRow - 1, 0)
          }
        } else if (direction === 'down') {
          if (focusedRow < redetectRow) {
            // Move to next emulator or redetect button
            onFocusChange(focusedRow + 1, 0)
          }
        } else if (direction === 'left') {
          if (focusedCol > 0) {
            onFocusChange(focusedRow, focusedCol - 1)
          } else {
            onBack()
          }
        } else if (direction === 'right') {
          if (focusedCol < maxCol) {
            onFocusChange(focusedRow, focusedCol + 1)
          }
        }
        return
      }

      // Navigation for redetect button (now at the end)
      if (currentSection === 'redetect') {
        if (direction === 'up') {
          // Go to last emulator, or last platform if no emulators
          if (emulators.length > 0) {
            onFocusChange(redetectRow - 1, 0)
          } else {
            onFocusChange(0, platformCount - 1)
          }
        } else if (direction === 'left') {
          onBack()
        }
        // Down does nothing - we're at the bottom
      }
    },
    onConfirm: handleConfirm,
    onBack: handleBackButton,
    scrollRef
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Emulator Settings</h2>
      </div>

      {/* Default emulator per platform */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Default emulator per platform</h3>
        <p className="text-surface-400 text-sm mb-4">
          Choose which emulator to use for each platform when a game has no specific override.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLATFORMS.map((p, index) => {
            const options = getOptionsForPlatform(p.id)
            const isThisPlatformFocused = isPlatformFocused(index)
            const isThisDropdownOpen = openPlatformId === p.id
            const currentEmulator = defaults[p.id] ? options.find(e => e.id === defaults[p.id]) : null
            const displayValue = currentEmulator?.name ?? 'Default (first installed)'
            
            return (
              <div
                key={p.id}
                data-focus-row={0}
                data-focus-col={index}
                className={`bg-surface-800 rounded-lg px-4 py-3 transition-all relative ${
                  isThisPlatformFocused || isThisDropdownOpen ? 'ring-2 ring-accent' : ''
                } ${isThisPlatformFocused ? 'scale-[1.02]' : ''}`}
              >
                <label className="block text-sm font-medium mb-1">{p.shortName}</label>
                
                {isThisDropdownOpen ? (
                  // Dropdown open - show options list
                  <div className="bg-surface-900 border border-accent rounded overflow-hidden">
                    {options.map((opt, optIndex) => (
                      <div
                        key={opt.id}
                        className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                          optIndex === selectedOptionIndex
                            ? 'bg-accent text-white'
                            : 'hover:bg-surface-800'
                        }`}
                        onClick={() => {
                          setSelectedOptionIndex(optIndex)
                          handleDefaultChange(p.id, opt.id)
                          closeDropdown()
                        }}
                      >
                        {opt.name}
                      </div>
                    ))}
                  </div>
                ) : isThisPlatformFocused ? (
                  // Gamepad-focused but not open - show current value with hint
                  <div 
                    className="flex items-center justify-between bg-surface-900 border border-accent rounded px-3 py-2 text-sm cursor-pointer"
                    onClick={() => openDropdown(p.id)}
                  >
                    <span className="truncate">{displayValue}</span>
                    <span className="text-accent text-xs ml-2">Press A</span>
                  </div>
                ) : (
                  // Regular select for mouse/keyboard
                  <select
                    value={defaults[p.id] ?? ''}
                    onChange={e => handleDefaultChange(p.id, e.target.value)}
                    className="w-full bg-surface-900 border border-surface-700 rounded px-3 py-2 text-sm"
                  >
                    {options.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Per-emulator cards */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Emulators</h3>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-4">
            {emulators.map((emu, index) => {
              const rowIndex = emulatorStartRow + index
              const isThisEmulatorFocused = isEmulatorFocused(index)
              return (
                <div 
                  key={emu.id} 
                  data-focus-row={rowIndex}
                  data-focus-col={0}
                  className={`bg-surface-800 rounded-lg p-4 transition-all ${
                    isThisEmulatorFocused ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{emu.name}</h4>
                      <p className="text-surface-400 text-sm">{getPlatformNames(emu.platforms)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={enabled[emu.id] !== false}
                          onChange={e => handleEnabledChange(emu.id, e.target.checked)}
                          className="w-4 h-4 accent-accent"
                        />
                        <span>Enabled</span>
                      </label>
                      <span className={`flex items-center gap-1 text-sm ${emu.installed ? 'text-green-400' : 'text-surface-400'}`}>
                        {emu.installed ? <Check size={16} /> : <X size={16} />}
                        {emu.installed ? 'Installed' : 'Not Installed'}
                      </span>
                    </div>
                  </div>

                  {emu.path && (
                    <div className="flex items-center gap-2 text-sm text-surface-400 mb-2">
                      <span className="font-mono truncate flex-1">{emu.path}</span>
                      {versionCache[emu.id] !== undefined && (
                        <span className="text-surface-500">Version: {versionCache[emu.id]}</span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      let buttonIdx = 0
                      return (
                        <>
                          <button
                            onClick={() => handleBrowse(emu.id)}
                            className={`px-3 py-1.5 rounded text-sm transition-all ${
                              isEmulatorButtonFocused(index, buttonIdx++)
                                ? 'bg-accent text-white ring-2 ring-accent scale-105'
                                : 'bg-surface-700 hover:bg-surface-600'
                            }`}
                          >
                            Browse
                          </button>
                          {emu.path && (
                            <button
                              onClick={() => handleClear(emu.id)}
                              className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-all ${
                                isEmulatorButtonFocused(index, buttonIdx++)
                                  ? 'bg-accent text-white ring-2 ring-accent scale-105'
                                  : 'bg-surface-700 hover:bg-surface-600'
                              }`}
                            >
                              <XCircle size={14} />
                              Clear
                            </button>
                          )}
                          {emu.installed && (
                            <button
                              onClick={() => handleOpenSettings(emu.id)}
                              className={`px-3 py-1.5 rounded text-sm flex items-center gap-1 transition-all ${
                                isEmulatorButtonFocused(index, buttonIdx++)
                                  ? 'bg-accent text-white ring-2 ring-accent scale-105'
                                  : 'bg-surface-700 hover:bg-surface-600'
                              }`}
                            >
                              <Settings2 size={14} />
                              Open {emu.name} Settings
                            </button>
                          )}
                          {!emu.installed && emu.downloadUrl && (
                            <button
                              onClick={() => handleDownload(emu.downloadUrl!)}
                              className={`px-3 py-1.5 rounded text-sm transition-all ${
                                isEmulatorButtonFocused(index, buttonIdx++)
                                  ? 'bg-accent text-white ring-2 ring-accent scale-105'
                                  : 'bg-accent hover:bg-accent-hover'
                              }`}
                            >
                              Download
                            </button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Re-detect button at the end */}
      <section className="mt-6">
        <button
          data-focus-row={redetectRow}
          data-focus-col={0}
          onClick={async () => {
            await loadEmulators()
            loadConfig()
            await refreshPlatformsWithEmulator()
          }}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
            isRedetectFocused()
              ? 'bg-accent text-white ring-2 ring-accent scale-105'
              : 'bg-surface-700 hover:bg-surface-600'
          }`}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Re-detect All Emulators
        </button>
      </section>
    </div>
  )
}

// BIOS Settings Section
function BiosSettings({ isFocused, focusedRow, focusedCol: _focusedCol, onFocusChange, onGridChange, onBack, justActivatedRef, scrollRef }: SettingsSectionProps) {
  const [biosFiles, setBiosFiles] = useState<BiosStatus[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useUIStore()

  // Simple single-column navigation
  const itemCount = biosFiles.length
  useEffect(() => {
    onGridChange({ rows: itemCount, cols: Array(itemCount).fill(1) })
  }, [itemCount, onGridChange])

  const loadBiosStatus = async () => {
    setLoading(true)
    try {
      const status = await window.electronAPI.bios.checkStatus()
      setBiosFiles(status)
    } catch (error) {
      console.error('Failed to load BIOS status:', error)
      addToast('error', 'Failed to load BIOS status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBiosStatus()
  }, [])

  const handleBrowse = async (biosId: string) => {
    const path = await window.electronAPI.dialog.openFile([
      { name: 'BIOS Files', extensions: ['bin', 'rom', 'BIN', 'ROM'] }
    ])
    if (path) {
      const updatedStatus = await window.electronAPI.bios.setPath(biosId, path)
      setBiosFiles(updatedStatus)
      addToast('success', 'BIOS path updated')
    }
  }

  // Handle gamepad confirmation
  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return
    
    const bios = biosFiles[focusedRow]
    if (bios) {
      handleBrowse(bios.id)
    }
  }, [focusedRow, biosFiles, justActivatedRef])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isFocused,
    onNavigate: (direction) => {
      if (direction === 'up') {
        if (focusedRow === 0) {
          onBack()
        } else {
          onFocusChange(focusedRow - 1, 0)
        }
      } else if (direction === 'down') {
        if (focusedRow < itemCount - 1) {
          onFocusChange(focusedRow + 1, 0)
        }
      } else if (direction === 'left') {
        onBack()
      }
    },
    onConfirm: handleConfirm,
    onBack,
    scrollRef
  })

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">BIOS & System Files</h2>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="text-yellow-500 flex-shrink-0" size={20} />
          <div>
            <p className="text-yellow-200 font-medium">Legal Notice</p>
            <p className="text-yellow-200/80 text-sm mt-1">
              BIOS files are copyrighted and cannot be distributed. You must dump these files from your own consoles.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-4">
          {biosFiles.map((bios, index) => (
            <div 
              key={bios.id}
              data-focus-row={index}
              data-focus-col={0}
              className={`bg-surface-800 rounded-lg p-4 transition-all ${
                isFocused && index === focusedRow ? 'ring-2 ring-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{bios.name}</h3>
                  {bios.required ? (
                    <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                      Required
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-surface-600 text-surface-300 rounded">
                      Optional
                    </span>
                  )}
                </div>
                <span className={`flex items-center gap-1 text-sm ${
                  bios.found ? 'text-green-400' : 'text-surface-400'
                }`}>
                  {bios.found ? <Check size={16} /> : <X size={16} />}
                  {bios.found ? 'Found' : 'Missing'}
                </span>
              </div>

              <p className="text-sm text-surface-400 mb-2">{bios.description}</p>

              {bios.path && (
                <p className="text-surface-500 text-sm font-mono truncate mb-3">{bios.path}</p>
              )}

              <button
                onClick={() => handleBrowse(bios.id)}
                className={`px-3 py-1.5 rounded text-sm transition-all ${
                  isFocused && index === focusedRow
                    ? 'bg-accent text-white scale-105'
                    : 'bg-surface-700 hover:bg-surface-600'
                }`}
              >
                Browse
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Paths Settings Section
function PathsSettings({ isFocused, focusedRow, focusedCol, onFocusChange, onGridChange, onBack, justActivatedRef, scrollRef }: SettingsSectionProps) {
  const [paths, setPaths] = useState({
    savesPath: '',
    statesPath: '',
    screenshotsPath: '',
    coversPath: ''
  })
  const [loading, setLoading] = useState(true)
  const { addToast } = useUIStore()

  const pathItems = [
    { key: 'savesPath' as const, label: 'Save Data' },
    { key: 'statesPath' as const, label: 'Save States' },
    { key: 'screenshotsPath' as const, label: 'Screenshots' },
    { key: 'coversPath' as const, label: 'Cover Art' }
  ]

  // Grid: 4 rows, 2 columns each (Browse, Open)
  useEffect(() => {
    onGridChange({ rows: 4, cols: [2, 2, 2, 2] })
  }, [onGridChange])

  useEffect(() => {
    const loadPaths = async () => {
      try {
        const config = await window.electronAPI.config.getAll() as Record<string, unknown>
        setPaths({
          savesPath: (config.savesPath as string) || '',
          statesPath: (config.statesPath as string) || '',
          screenshotsPath: (config.screenshotsPath as string) || '',
          coversPath: (config.coversPath as string) || ''
        })
      } catch (error) {
        console.error('Failed to load paths:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPaths()
  }, [])

  const handleBrowse = async (key: keyof typeof paths) => {
    const currentPath = paths[key] || undefined
    const path = await window.electronAPI.dialog.openDirectory(currentPath)
    if (path) {
      await window.electronAPI.config.set(key, path)
      setPaths(prev => ({ ...prev, [key]: path }))
      addToast('success', 'Path updated')
    }
  }

  // Helper to check if cell is focused
  const isCellFocused = (row: number, col: number) => {
    return isFocused && focusedRow === row && focusedCol === col
  }

  // Handle gamepad confirmation
  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return
    
    const pathKey = pathItems[focusedRow]?.key
    if (!pathKey) return
    
    if (focusedCol === 0) {
      handleBrowse(pathKey)
    } else {
      window.electronAPI.shell.openPath(paths[pathKey])
    }
  }, [focusedRow, focusedCol, paths, pathItems, justActivatedRef])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isFocused,
    onNavigate: (direction) => {
      if (direction === 'up') {
        if (focusedRow === 0) {
          onBack()
        } else {
          onFocusChange(focusedRow - 1, focusedCol)
        }
      } else if (direction === 'down') {
        if (focusedRow < 3) {
          onFocusChange(focusedRow + 1, focusedCol)
        }
      } else if (direction === 'left') {
        if (focusedCol > 0) {
          onFocusChange(focusedRow, focusedCol - 1)
        } else {
          onBack()
        }
      } else if (direction === 'right') {
        if (focusedCol < 1) {
          onFocusChange(focusedRow, focusedCol + 1)
        }
      }
    },
    onConfirm: handleConfirm,
    onBack,
    scrollRef
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Paths</h2>

      <div className="space-y-4">
        {pathItems.map((item, rowIndex) => (
          <div key={item.key} className="bg-surface-800 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">{item.label}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={paths[item.key]}
                readOnly
                className="flex-1 bg-surface-900 border border-surface-700 rounded px-3 py-2 text-sm font-mono"
              />
              <button
                data-focus-row={rowIndex}
                data-focus-col={0}
                onClick={() => handleBrowse(item.key)}
                className={`px-3 py-2 rounded text-sm transition-all ${
                  isCellFocused(rowIndex, 0)
                    ? 'bg-accent text-white ring-2 ring-accent scale-105'
                    : 'bg-surface-700 hover:bg-surface-600'
                }`}
              >
                Browse
              </button>
              <button
                data-focus-row={rowIndex}
                data-focus-col={1}
                onClick={() => window.electronAPI.shell.openPath(paths[item.key])}
                className={`px-3 py-2 rounded text-sm transition-all ${
                  isCellFocused(rowIndex, 1)
                    ? 'bg-accent text-white ring-2 ring-accent scale-105'
                    : 'bg-surface-700 hover:bg-surface-600'
                }`}
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Metadata Settings Section
function MetadataSettings({ isFocused, focusedRow, focusedCol: _focusedCol, onFocusChange, onGridChange, onBack, justActivatedRef, scrollRef }: SettingsSectionProps) {
  const { addToast } = useUIStore()
  const { scrapeAllGames, cancelScrape, isScraping, scrapeProgress, games, loadLibrary } = useLibraryStore()
  const [autoScrape, setAutoScrape] = useState(false)
  const [loading, setLoading] = useState(true)

  // Simple 2-row navigation: autoScrape checkbox, scrape all/cancel button
  useEffect(() => {
    onGridChange({ rows: 2, cols: [1, 1] })
  }, [onGridChange])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const config = await window.electronAPI.config.getAll() as Record<string, unknown>
        setAutoScrape(config.autoScrape === true)
      } catch (error) {
        console.error('Failed to load metadata settings:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleAutoScrapeChange = async (checked: boolean) => {
    setAutoScrape(checked)
    await window.electronAPI.config.set('autoScrape', checked)
    addToast('success', checked ? 'Auto-scrape enabled' : 'Auto-scrape disabled')
  }

  const handleScrapeAll = async () => {
    try {
      const results = await scrapeAllGames()
      const successCount = results.filter(r => r.success && r.matched).length
      await loadLibrary()
      addToast('success', `Scraped ${successCount} of ${results.length} games`)
    } catch (error) {
      console.error('Failed to scrape all games:', error)
      addToast('error', 'Failed to scrape all games')
    }
  }

  const handleCancelScrape = async () => {
    await cancelScrape()
    addToast('info', 'Scraping cancelled')
  }

  // Helper to check if row is focused
  const isRowFocused = (row: number) => {
    return isFocused && focusedRow === row
  }

  // Handle gamepad confirmation
  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return
    
    if (focusedRow === 0) {
      handleAutoScrapeChange(!autoScrape)
    } else if (focusedRow === 1) {
      if (isScraping) {
        handleCancelScrape()
      } else {
        handleScrapeAll()
      }
    }
  }, [focusedRow, autoScrape, isScraping, justActivatedRef])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isFocused,
    onNavigate: (direction) => {
      if (direction === 'up') {
        if (focusedRow === 0) {
          onBack()
        } else {
          onFocusChange(focusedRow - 1, 0)
        }
      } else if (direction === 'down') {
        if (focusedRow < 1) {
          onFocusChange(focusedRow + 1, 0)
        }
      } else if (direction === 'left') {
        onBack()
      }
    },
    onConfirm: handleConfirm,
    onBack,
    scrollRef
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Metadata Settings</h2>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Automatic Metadata Lookup</h3>
        <label 
          data-focus-row={0}
          data-focus-col={0}
          className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-all ${
            isRowFocused(0) ? 'bg-surface-800 ring-2 ring-accent' : ''
          }`}>
          <input
            type="checkbox"
            checked={autoScrape}
            onChange={e => handleAutoScrapeChange(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <div>
            <span className="font-medium">Automatically look up metadata for new games when you scan your ROM folders</span>
            <p className="text-surface-400 text-sm mt-1">
              When enabled, EasyEmu will automatically fetch game metadata (title, cover art, description, etc.) from Hasheous for newly scanned games.
            </p>
          </div>
        </label>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Bulk Metadata Scraping</h3>
        <p className="text-surface-400 mb-4">
          Scrape metadata for all games in your library. This will fetch titles, cover art, descriptions, and other metadata from Hasheous.
        </p>
        
        {isScraping && scrapeProgress && (
          <div className="bg-surface-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Scraping progress</span>
              <span className="text-sm text-surface-400">
                {scrapeProgress.current} / {scrapeProgress.total}
              </span>
            </div>
            <div className="w-full bg-surface-900 rounded-full h-2 mb-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${(scrapeProgress.current / scrapeProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-surface-400 truncate">
              {scrapeProgress.currentGame}
            </p>
            <button
              data-focus-row={1}
              data-focus-col={0}
              onClick={handleCancelScrape}
              className={`mt-3 px-3 py-1.5 rounded text-sm transition-all ${
                isRowFocused(1)
                  ? 'bg-accent text-white ring-2 ring-accent scale-105'
                  : 'bg-surface-700 hover:bg-surface-600'
              }`}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            data-focus-row={1}
            data-focus-col={0}
            onClick={handleScrapeAll}
            disabled={isScraping || games.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              isRowFocused(1)
                ? 'bg-accent text-white ring-2 ring-accent scale-105'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {isScraping ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Download size={18} />
                Scrape All Games ({games.length})
              </>
            )}
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Manual Metadata Management</h3>
        <p className="text-surface-400 mb-4">
          You can manually edit game metadata, including title, cover art, and backdrop images, 
          by clicking the Edit button on any game's details page.
        </p>
      </section>
    </div>
  )
}

// General Settings Section
function GeneralSettings({ isFocused, focusedRow, focusedCol, onFocusChange, onGridChange, onBack, justActivatedRef, scrollRef }: SettingsSectionProps) {
  const { setFirstRun } = useAppStore()
  const { addToast } = useUIStore()
  const [startMinimized, setStartMinimized] = useState(false)
  const [checkUpdates, setCheckUpdates] = useState(true)
  const [version, setVersion] = useState('0.0.0')
  const [loading, setLoading] = useState(true)

  // Update state
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateProgress, setUpdateProgress] = useState<UpdateDownloadProgress>({
    status: 'idle',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0
  })

  // 4 rows: startMinimized, checkUpdates, update buttons (1 or 2 cols), reset buttons (2 cols)
  // Row 2 has 2 cols when update is downloaded (Open Folder + Install)
  const updateRow2Cols = updateProgress.status === 'complete' ? 2 : 1
  useEffect(() => {
    onGridChange({ rows: 4, cols: [1, 1, updateRow2Cols, 2] })
  }, [onGridChange, updateRow2Cols])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const config = await window.electronAPI.config.getAll() as Record<string, unknown>
        setStartMinimized(config.startMinimized === true)
        setCheckUpdates(config.checkUpdates !== false)
        const ver = await window.electronAPI.app.getVersion()
        setVersion(ver)
      } catch (error) {
        console.error('Failed to load general settings:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  // Subscribe to update progress events
  useEffect(() => {
    const unsubscribeProgress = window.electronAPI.updater.onProgress((progress) => {
      setUpdateProgress(progress)
    })
    const unsubscribeAvailable = window.electronAPI.updater.onUpdateAvailable((info) => {
      setUpdateInfo(info)
      if (info.hasUpdate) {
        addToast('info', `Update available: v${info.latestVersion}`)
      }
    })
    return () => {
      unsubscribeProgress()
      unsubscribeAvailable()
    }
  }, [addToast])

  const handleStartMinimizedChange = async (checked: boolean) => {
    setStartMinimized(checked)
    await window.electronAPI.config.set('startMinimized', checked)
  }

  const handleCheckUpdatesChange = async (checked: boolean) => {
    setCheckUpdates(checked)
    await window.electronAPI.config.set('checkUpdates', checked)
  }

  const handleResetDefaults = async () => {
    addToast('warning', 'This feature is not yet implemented')
  }

  const handleCheckForUpdates = async () => {
    try {
      setUpdateProgress({ status: 'checking', progress: 0, downloadedBytes: 0, totalBytes: 0 })
      const info = await window.electronAPI.updater.check()
      setUpdateInfo(info)
      if (info?.hasUpdate) {
        addToast('info', `Update available: v${info.latestVersion}`)
      } else {
        addToast('success', 'You are on the latest version')
      }
    } catch (error) {
      console.error('Failed to check for updates:', error)
      addToast('error', 'Failed to check for updates')
      setUpdateProgress({ status: 'error', progress: 0, downloadedBytes: 0, totalBytes: 0, error: (error as Error).message })
    }
  }

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) {
      addToast('error', 'No download URL available')
      return
    }
    try {
      await window.electronAPI.updater.download(
        updateInfo.downloadUrl,
        updateInfo.assetName,
        updateInfo.assetSize
      )
      addToast('success', 'Update downloaded successfully')
    } catch (error) {
      console.error('Failed to download update:', error)
      addToast('error', 'Failed to download update')
    }
  }

  const handleOpenDownloadFolder = () => {
    window.electronAPI.updater.openDownloadFolder()
  }

  const handleInstallUpdate = async () => {
    try {
      await window.electronAPI.updater.installUpdate()
    } catch (error) {
      console.error('Failed to install update:', error)
      addToast('error', 'Failed to install update')
    }
  }

  // Helper to check if cell is focused
  const isCellFocused = (row: number, col: number = 0) => {
    return isFocused && focusedRow === row && focusedCol === col
  }

  // Handle gamepad confirmation
  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return

    if (focusedRow === 0) {
      handleStartMinimizedChange(!startMinimized)
    } else if (focusedRow === 1) {
      handleCheckUpdatesChange(!checkUpdates)
    } else if (focusedRow === 2) {
      // Update button row - action depends on state
      if (updateProgress.status === 'complete') {
        if (focusedCol === 0) {
          handleOpenDownloadFolder()
        } else {
          handleInstallUpdate()
        }
      } else if (updateInfo?.hasUpdate && updateProgress.status === 'idle') {
        handleDownloadUpdate()
      } else if (updateProgress.status === 'idle' || updateProgress.status === 'error') {
        handleCheckForUpdates()
      }
    } else if (focusedRow === 3) {
      if (focusedCol === 0) {
        setFirstRun(true)
        addToast('info', 'Returning to setup wizard...')
      } else {
        handleResetDefaults()
      }
    }
  }, [focusedRow, focusedCol, startMinimized, checkUpdates, setFirstRun, addToast, justActivatedRef, updateInfo, updateProgress.status])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isFocused,
    onNavigate: (direction) => {
      if (direction === 'up') {
        if (focusedRow === 0) {
          onBack()
        } else {
          onFocusChange(focusedRow - 1, 0)
        }
      } else if (direction === 'down') {
        if (focusedRow < 3) {
          onFocusChange(focusedRow + 1, 0)
        }
      } else if (direction === 'left') {
        if ((focusedRow === 2 || focusedRow === 3) && focusedCol > 0) {
          onFocusChange(focusedRow, focusedCol - 1)
        } else {
          onBack()
        }
      } else if (direction === 'right') {
        const maxCol = focusedRow === 2 ? updateRow2Cols - 1 : 1
        if ((focusedRow === 2 || focusedRow === 3) && focusedCol < maxCol) {
          onFocusChange(focusedRow, focusedCol + 1)
        }
      }
    },
    onConfirm: handleConfirm,
    onBack,
    scrollRef
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">General Settings</h2>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Startup</h3>
        <label 
          data-focus-row={0}
          data-focus-col={0}
          className={`flex items-center gap-3 cursor-pointer p-2 rounded transition-all ${
            isCellFocused(0) ? 'bg-surface-800 ring-2 ring-accent' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={startMinimized}
            onChange={e => handleStartMinimizedChange(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span>Start minimized to system tray</span>
        </label>
        <label 
          data-focus-row={1}
          data-focus-col={0}
          className={`flex items-center gap-3 cursor-pointer mt-2 p-2 rounded transition-all ${
            isCellFocused(1) ? 'bg-surface-800 ring-2 ring-accent' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={checkUpdates}
            onChange={e => handleCheckUpdatesChange(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span>Check for updates on startup</span>
        </label>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Updates</h3>
        <p className="text-surface-400 mb-4">Current version: {version}</p>

        {/* Update available banner */}
        {updateInfo?.hasUpdate && updateProgress.status !== 'downloading' && updateProgress.status !== 'complete' && (
          <div className="bg-accent/20 border border-accent/30 rounded-lg p-4 mb-4">
            <p className="text-accent font-medium mb-1">
              Update available: v{updateInfo.latestVersion}
            </p>
            <p className="text-surface-400 text-sm">
              Released: {new Date(updateInfo.publishedAt).toLocaleDateString()}
            </p>
            {updateInfo.releaseNotes && (
              <p className="text-surface-300 text-sm mt-2 line-clamp-3">
                {updateInfo.releaseNotes.slice(0, 200)}
                {updateInfo.releaseNotes.length > 200 ? '...' : ''}
              </p>
            )}
          </div>
        )}

        {/* Downloading progress */}
        {updateProgress.status === 'downloading' && (
          <div className="bg-surface-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-surface-300">Downloading update...</span>
              <span className="text-accent">{updateProgress.progress}%</span>
            </div>
            <div className="w-full bg-surface-700 rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${updateProgress.progress}%` }}
              />
            </div>
            <p className="text-surface-400 text-sm mt-2">
              {(updateProgress.downloadedBytes / 1024 / 1024).toFixed(1)} MB / {(updateProgress.totalBytes / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        )}

        {/* Download complete */}
        {updateProgress.status === 'complete' && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
            <p className="text-green-400 font-medium mb-1">
              Update downloaded successfully!
            </p>
            <p className="text-surface-400 text-sm">
              {updateInfo?.assetName}
            </p>
          </div>
        )}

        {/* Error state */}
        {updateProgress.status === 'error' && updateProgress.error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400 font-medium">
              Error: {updateProgress.error}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          {/* Checking state */}
          {updateProgress.status === 'checking' && (
            <button
              disabled
              className="px-4 py-2 rounded-lg bg-surface-700 text-surface-400 flex items-center gap-2"
            >
              <Loader2 size={16} className="animate-spin" />
              Checking...
            </button>
          )}

          {/* Idle or error - show Check for Updates */}
          {(updateProgress.status === 'idle' || updateProgress.status === 'error') && !updateInfo?.hasUpdate && (
            <button
              data-focus-row={2}
              data-focus-col={0}
              onClick={handleCheckForUpdates}
              className={`px-4 py-2 rounded-lg transition-all ${
                isCellFocused(2)
                  ? 'bg-accent text-white ring-2 ring-accent scale-105'
                  : 'bg-surface-700 hover:bg-surface-600'
              }`}
            >
              Check for Updates
            </button>
          )}

          {/* Update available - show Download button */}
          {updateInfo?.hasUpdate && updateProgress.status === 'idle' && (
            <button
              data-focus-row={2}
              data-focus-col={0}
              onClick={handleDownloadUpdate}
              className={`px-4 py-2 rounded-lg transition-all ${
                isCellFocused(2)
                  ? 'bg-accent text-white ring-2 ring-accent scale-105'
                  : 'bg-accent hover:bg-accent-hover'
              }`}
            >
              <Download size={16} className="inline mr-2" />
              Download Update
            </button>
          )}

          {/* Download complete - show Open Folder and Install buttons */}
          {updateProgress.status === 'complete' && (
            <>
              <button
                data-focus-row={2}
                data-focus-col={0}
                onClick={handleOpenDownloadFolder}
                className={`px-4 py-2 rounded-lg transition-all ${
                  isCellFocused(2, 0)
                    ? 'bg-accent text-white ring-2 ring-accent scale-105'
                    : 'bg-surface-700 hover:bg-surface-600'
                }`}
              >
                <ExternalLink size={16} className="inline mr-2" />
                Open Folder
              </button>
              <button
                data-focus-row={2}
                data-focus-col={1}
                onClick={handleInstallUpdate}
                className={`px-4 py-2 rounded-lg transition-all ${
                  isCellFocused(2, 1)
                    ? 'bg-green-500 text-white ring-2 ring-green-400 scale-105'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                Install Update
              </button>
            </>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">Reset</h3>
        <div className="flex gap-3">
          <button
            data-focus-row={3}
            data-focus-col={0}
            onClick={() => {
              setFirstRun(true)
              addToast('info', 'Returning to setup wizard...')
            }}
            className={`px-4 py-2 rounded-lg transition-all ${
              isCellFocused(3, 0)
                ? 'bg-accent text-white ring-2 ring-accent scale-105'
                : 'bg-surface-700 hover:bg-surface-600'
            }`}
          >
            Re-run Setup Wizard
          </button>
          <button
            data-focus-row={3}
            data-focus-col={1}
            onClick={handleResetDefaults}
            className={`px-4 py-2 rounded-lg transition-all ${
              isCellFocused(3, 1)
                ? 'bg-red-500 text-white ring-2 ring-red-400 scale-105'
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
            }`}
          >
            Reset to Defaults
          </button>
        </div>
      </section>
    </div>
  )
}
