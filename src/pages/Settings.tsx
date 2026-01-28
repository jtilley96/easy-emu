import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FolderOpen,
  Database,
  Download,
  Keyboard,
  Info,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Loader2,
  Sparkles
} from 'lucide-react'
import { PLATFORMS } from '../constants/platforms'
import { useAppStore } from '../store/appStore'
import { useLibraryStore } from '../store/libraryStore'
import { useUIStore } from '../store/uiStore'
import ControllersSettings from '../components/settings/ControllersSettings'
import { UpdateInfo, UpdateDownloadProgress } from '../types'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import { useLayoutContext } from '../components/Layout'
import { SettingsSectionProps } from '../types'

type SettingsSection = 'library' | 'paths' | 'metadata' | 'controllers' | 'general'

interface NavItem {
  id: SettingsSection
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { id: 'general', label: 'General', icon: <Info size={18} /> },
  { id: 'library', label: 'Library', icon: <FolderOpen size={18} /> },
  { id: 'paths', label: 'Paths', icon: <Database size={18} /> },
  { id: 'metadata', label: 'Metadata', icon: <Sparkles size={18} /> },
  { id: 'controllers', label: 'Hotkeys', icon: <Keyboard size={18} /> }
]

export default function Settings() {
  const { section } = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const currentSection = (section as SettingsSection) || 'general'
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
    const result = await scanLibrary()
    if (result) {
      const parts: string[] = []
      if (result.added > 0) parts.push(`${result.added} added`)
      if (result.removed > 0) parts.push(`${result.removed} removed`)
      const message = parts.length > 0
        ? `Library scan complete: ${parts.join(', ')}`
        : 'Library scan complete: no changes'
      addToast('success', message)
    } else {
      addToast('info', 'No ROM folders configured')
    }
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
      if (focusedRow > 0) {
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
        if (focusedRow > 0) {
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
        if (focusedRow > 0) {
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

  // 5 rows: startMinimized, checkUpdates, update buttons (1 or 2 cols), reset buttons (2 cols), uninstall
  // Row 2 has 2 cols when update is downloaded (Open Folder + Install)
  const updateRow2Cols = updateProgress.status === 'complete' ? 2 : 1
  useEffect(() => {
    onGridChange({ rows: 5, cols: [1, 1, updateRow2Cols, 2, 1] })
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
      // Toast notification is handled globally in App.tsx
    })
    return () => {
      unsubscribeProgress()
      unsubscribeAvailable()
    }
  }, [])

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

  const handleUninstall = async () => {
    try {
      await window.electronAPI.app.uninstall()
    } catch {
      addToast('error', 'Failed to start uninstaller')
    }
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
      } else if (updateInfo?.hasUpdate && (updateProgress.status === 'idle' || updateProgress.status === 'error')) {
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
    } else if (focusedRow === 4) {
      handleUninstall()
    }
  }, [focusedRow, focusedCol, startMinimized, checkUpdates, setFirstRun, addToast, justActivatedRef, updateInfo, updateProgress.status])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isFocused,
    onNavigate: (direction) => {
      if (direction === 'up') {
        if (focusedRow > 0) {
          onFocusChange(focusedRow - 1, 0)
        }
      } else if (direction === 'down') {
        if (focusedRow < 4) {
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
              <div className="text-surface-300 text-sm mt-2 space-y-1">
                {updateInfo.releaseNotes.split('\n').filter(l => l.trim()).map((line, i) => {
                  const trimmed = line.trim()
                  if (trimmed.startsWith('# ')) {
                    return <p key={i} className="font-bold text-surface-200">{trimmed.slice(2)}</p>
                  }
                  if (trimmed.startsWith('## ')) {
                    return <p key={i} className="font-semibold text-surface-200">{trimmed.slice(3)}</p>
                  }
                  if (trimmed.startsWith('### ')) {
                    return <p key={i} className="font-medium text-surface-200">{trimmed.slice(4)}</p>
                  }
                  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    return <p key={i} className="pl-4">• {trimmed.slice(2)}</p>
                  }
                  return <p key={i}>{trimmed}</p>
                })}
              </div>
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
              data-focus-row={2}
              data-focus-col={0}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                isCellFocused(2)
                  ? 'bg-surface-600 text-surface-300 ring-2 ring-accent scale-105'
                  : 'bg-surface-700 text-surface-400'
              }`}
            >
              <Loader2 size={16} className="animate-spin" />
              Checking...
            </button>
          )}

          {/* Downloading state */}
          {updateProgress.status === 'downloading' && (
            <button
              disabled
              data-focus-row={2}
              data-focus-col={0}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                isCellFocused(2)
                  ? 'bg-surface-600 text-surface-300 ring-2 ring-accent scale-105'
                  : 'bg-surface-700 text-surface-400'
              }`}
            >
              <Loader2 size={16} className="animate-spin" />
              Downloading... {updateProgress.progress}%
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

          {/* Update available - show Download button (or Retry if error) */}
          {updateInfo?.hasUpdate && (updateProgress.status === 'idle' || updateProgress.status === 'error') && (
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
              {updateProgress.status === 'error' ? 'Retry Download' : 'Download Update'}
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

      <section className="mb-8">
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

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Uninstall</h3>
        <p className="text-surface-400 text-sm mb-4">
          Completely remove Easy Emu from your system.
        </p>
        <button
          data-focus-row={4}
          data-focus-col={0}
          onClick={handleUninstall}
          className={`px-4 py-2 rounded-lg transition-all ${
            isCellFocused(4)
              ? 'bg-red-500 text-white ring-2 ring-red-400 scale-105'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
          }`}
        >
          <Trash2 size={16} className="inline mr-2" />
          Uninstall Easy Emu
        </button>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">Supported File Types</h3>
        <p className="text-surface-400 text-sm mb-4">
          These are the ROM/game file formats that can be scanned and played for each system.
        </p>
        <div className="bg-surface-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700">
                <th className="text-left px-4 py-2 font-medium">System</th>
                <th className="text-left px-4 py-2 font-medium">Supported Formats</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORMS.map((platform, index) => (
                <tr
                  key={platform.id}
                  className={index % 2 === 0 ? 'bg-surface-800' : 'bg-surface-800/50'}
                >
                  <td className="px-4 py-2 font-medium text-surface-200">
                    {platform.shortName}
                  </td>
                  <td className="px-4 py-2 text-surface-400">
                    <code className="text-xs">
                      {platform.extensions.join(', ')}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-surface-500 text-xs mt-3">
          Note: Some formats like .iso, .bin, and .cue are shared across multiple systems.
          The scanner uses folder names to help identify the correct platform.
        </p>
      </section>
    </div>
  )
}
