import { useState, useEffect, useCallback } from 'react'
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
import { EmulatorInfo } from '../types'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import { useLayoutContext } from '../components/Layout'

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

  // Update focused section index based on current route
  useEffect(() => {
    const currentIndex = NAV_ITEMS.findIndex(item => item.id === currentSection)
    if (currentIndex >= 0) {
      setFocusedSectionIndex(currentIndex)
    }
  }, [currentSection])

  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isSidebarFocused) return

    if (isSectionListFocused) {
      // Navigate settings sections
      if (direction === 'up') {
        if (focusedSectionIndex === 0) {
          // At top - return focus to main sidebar
          setIsSidebarFocused(true)
        } else {
          setFocusedSectionIndex(prev => prev - 1)
        }
      } else if (direction === 'down') {
        setFocusedSectionIndex(prev => Math.min(NAV_ITEMS.length - 1, prev + 1))
      } else if (direction === 'right') {
        // Move focus to content area
        setIsSectionListFocused(false)
      } else if (direction === 'left') {
        // Return focus to main sidebar
        setIsSidebarFocused(true)
      }
    } else {
      // In content area - left goes back to section list
      if (direction === 'left') {
        setIsSectionListFocused(true)
      } else if (direction === 'up') {
        setIsSectionListFocused(true)
      }
    }
  }, [isSidebarFocused, isSectionListFocused, focusedSectionIndex, setIsSidebarFocused])

  const handleConfirm = useCallback(() => {
    if (isSidebarFocused) return
    if (isSectionListFocused) {
      navigate(`/settings/${NAV_ITEMS[focusedSectionIndex].id}`)
      setIsSectionListFocused(false)
    }
  }, [isSidebarFocused, isSectionListFocused, focusedSectionIndex, navigate])

  const handleBack = useCallback(() => {
    if (isSidebarFocused) return
    if (isSectionListFocused) {
      setIsSidebarFocused(true)
    } else {
      setIsSectionListFocused(true)
    }
  }, [isSidebarFocused, isSectionListFocused, setIsSidebarFocused])

  // Gamepad navigation (only when page is focused)
  useGamepadNavigation({
    enabled: !isSidebarFocused,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  return (
    <div className="flex h-full">
      {/* Settings Navigation */}
      <nav className="w-56 bg-surface-900 border-r border-surface-800 p-4">
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
                      ? 'bg-accent text-white'
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
      <div className="flex-1 overflow-auto p-6">
        {currentSection === 'library' && <LibrarySettings />}
        {currentSection === 'emulators' && <EmulatorsSettings />}
        {currentSection === 'cores' && <CoreManagerSection />}
        {currentSection === 'bios' && <BiosSettings />}
        {currentSection === 'paths' && <PathsSettings />}
        {currentSection === 'metadata' && <MetadataSettings />}
        {currentSection === 'controllers' && <ControllersSettings />}
        {currentSection === 'general' && <GeneralSettings />}
      </div>
    </div>
  )
}

// Library Settings Section
function LibrarySettings() {
  const { romFolders, addRomFolder, removeRomFolder, scanLibrary, isScanning } = useLibraryStore()
  const { addToast } = useUIStore()

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
            romFolders.map(folder => (
              <div
                key={folder}
                className="flex items-center justify-between bg-surface-800 rounded-lg px-4 py-3"
              >
                <span className="font-mono text-sm truncate flex-1">{folder}</span>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => window.electronAPI.shell.openPath(folder)}
                    className="p-2 hover:bg-surface-700 rounded"
                    title="Open folder"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={() => {
                      removeRomFolder(folder)
                      addToast('info', 'Folder removed')
                    }}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded"
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
            onClick={handleAddFolder}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg transition-all"
          >
            <Plus size={18} />
            Add Folder
          </button>
          {romFolders.length > 0 && (
            <button
              onClick={handleScan}
              disabled={isScanning || romFolders.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
function EmulatorsSettings() {
  const [emulators, setEmulators] = useState<EmulatorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [versionCache, setVersionCache] = useState<Record<string, string>>({})
  const [defaults, setDefaults] = useState<Record<string, string>>({})
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const { addToast } = useUIStore()
  const refreshPlatformsWithEmulator = useLibraryStore(s => s.refreshPlatformsWithEmulator)

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Emulator Settings</h2>
        <button
          onClick={async () => {
            await loadEmulators()
            loadConfig()
            await refreshPlatformsWithEmulator()
          }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Re-detect All
        </button>
      </div>

      {/* Default emulator per platform */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Default emulator per platform</h3>
        <p className="text-surface-400 text-sm mb-4">
          Choose which emulator to use for each platform when a game has no specific override.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLATFORMS.map(p => {
            const options = installedForPlatform(p.id)
            return (
              <div key={p.id} className="bg-surface-800 rounded-lg px-4 py-3">
                <label className="block text-sm font-medium mb-1">{p.shortName}</label>
                <select
                  value={defaults[p.id] ?? ''}
                  onChange={e => handleDefaultChange(p.id, e.target.value)}
                  className="w-full bg-surface-900 border border-surface-700 rounded px-3 py-2 text-sm"
                >
                  <option value="">Default (first installed)</option>
                  {options.map(emu => (
                    <option key={emu.id} value={emu.id}>{emu.name}</option>
                  ))}
                </select>
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
            {emulators.map(emu => (
              <div key={emu.id} className="bg-surface-800 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{emu.name}</h4>
                    <p className="text-surface-400 text-sm">{getPlatformNames(emu.platforms)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
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
                  <button
                    onClick={() => handleBrowse(emu.id)}
                    className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm"
                  >
                    Browse
                  </button>
                  {emu.path && (
                    <button
                      onClick={() => handleClear(emu.id)}
                      className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm flex items-center gap-1"
                    >
                      <XCircle size={14} />
                      Clear
                    </button>
                  )}
                  {emu.installed && (
                    <button
                      onClick={() => handleOpenSettings(emu.id)}
                      className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm flex items-center gap-1"
                    >
                      <Settings2 size={14} />
                      Open {emu.name} Settings
                    </button>
                  )}
                  {!emu.installed && emu.downloadUrl && (
                    <button
                      onClick={() => handleDownload(emu.downloadUrl!)}
                      className="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded text-sm"
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// BIOS Settings Section
function BiosSettings() {
  const [biosFiles, setBiosFiles] = useState<BiosStatus[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useUIStore()

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
          {biosFiles.map(bios => (
            <div key={bios.id} className="bg-surface-800 rounded-lg p-4">
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
                className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm"
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
function PathsSettings() {
  const [paths, setPaths] = useState({
    savesPath: '',
    statesPath: '',
    screenshotsPath: '',
    coversPath: ''
  })
  const [loading, setLoading] = useState(true)
  const { addToast } = useUIStore()

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

  const pathItems = [
    { key: 'savesPath' as const, label: 'Save Data' },
    { key: 'statesPath' as const, label: 'Save States' },
    { key: 'screenshotsPath' as const, label: 'Screenshots' },
    { key: 'coversPath' as const, label: 'Cover Art' }
  ]

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
        {pathItems.map(item => (
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
                onClick={() => handleBrowse(item.key)}
                className="px-3 py-2 bg-surface-700 hover:bg-surface-600 rounded text-sm"
              >
                Browse
              </button>
              <button
                onClick={() => window.electronAPI.shell.openPath(paths[item.key])}
                className="px-3 py-2 bg-surface-700 hover:bg-surface-600 rounded text-sm"
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
function MetadataSettings() {
  const { addToast } = useUIStore()
  const { scrapeAllGames, cancelScrape, isScraping, scrapeProgress, games, loadLibrary } = useLibraryStore()
  const [autoScrape, setAutoScrape] = useState(false)
  const [loading, setLoading] = useState(true)

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
        <label className="flex items-center gap-3 cursor-pointer">
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
              onClick={handleCancelScrape}
              className="mt-3 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleScrapeAll}
            disabled={isScraping || games.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
function GeneralSettings() {
  const { setFirstRun } = useAppStore()
  const { addToast } = useUIStore()
  const [startMinimized, setStartMinimized] = useState(false)
  const [checkUpdates, setCheckUpdates] = useState(true)
  const [version, setVersion] = useState('0.0.0')
  const [loading, setLoading] = useState(true)

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
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={startMinimized}
            onChange={e => handleStartMinimizedChange(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span>Start minimized to system tray</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer mt-2">
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
        <button
          onClick={() => addToast('info', 'Update check not implemented yet')}
          className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg"
        >
          Check for Updates
        </button>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">Reset</h3>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setFirstRun(true)
              addToast('info', 'Returning to setup wizard...')
            }}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg"
          >
            Re-run Setup Wizard
          </button>
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
          >
            Reset to Defaults
          </button>
        </div>
      </section>
    </div>
  )
}
