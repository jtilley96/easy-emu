import { useState, useEffect } from 'react'
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
  Loader2
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useLibraryStore } from '../store/libraryStore'
import { useUIStore } from '../store/uiStore'

type SettingsSection = 'library' | 'emulators' | 'bios' | 'paths' | 'metadata' | 'controllers' | 'general'

interface NavItem {
  id: SettingsSection
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { id: 'library', label: 'Library', icon: <FolderOpen size={18} /> },
  { id: 'emulators', label: 'Emulators', icon: <Gamepad2 size={18} /> },
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

  return (
    <div className="flex h-full">
      {/* Settings Navigation */}
      <nav className="w-56 bg-surface-900 border-r border-surface-800 p-4">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <ul className="space-y-1">
          {NAV_ITEMS.map(item => (
            <li key={item.id}>
              <button
                onClick={() => navigate(`/settings/${item.id}`)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentSection === item.id
                    ? 'bg-accent text-white'
                    : 'hover:bg-surface-800 text-surface-300'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto p-6">
        {currentSection === 'library' && <LibrarySettings />}
        {currentSection === 'emulators' && <EmulatorsSettings />}
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
    const path = await window.electronAPI.dialog.openDirectory()
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
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg"
          >
            <Plus size={18} />
            Add Folder
          </button>
          <button
            onClick={handleScan}
            disabled={isScanning || romFolders.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={isScanning ? 'spinner' : ''} />
            {isScanning ? 'Scanning...' : 'Rescan Library'}
          </button>
        </div>
      </section>
    </div>
  )
}

// Emulators Settings Section
function EmulatorsSettings() {
  const [emulators, setEmulators] = useState<EmulatorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const { addToast } = useUIStore()

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

  useEffect(() => {
    loadEmulators()
  }, [])

  const handleBrowse = async (emulatorId: string) => {
    const path = await window.electronAPI.dialog.openFile([
      { name: 'Executable', extensions: ['exe', 'app', ''] }
    ])
    if (path) {
      await window.electronAPI.emulators.configure(emulatorId, { path })
      await loadEmulators()
      addToast('success', 'Emulator path updated')
    }
  }

  const handleDownload = async (url: string) => {
    await window.electronAPI.shell.openExternal(url)
  }

  const getPlatformNames = (platforms: string[]): string => {
    const names: Record<string, string> = {
      nes: 'NES', snes: 'SNES', n64: 'N64', gb: 'Game Boy', gbc: 'GBC', gba: 'GBA',
      nds: 'NDS', gamecube: 'GameCube', wii: 'Wii', switch: 'Switch', genesis: 'Genesis',
      ps1: 'PS1', ps2: 'PS2', ps3: 'PS3', psp: 'PSP', arcade: 'Arcade'
    }
    return platforms.map(p => names[p] || p).join(', ')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Emulator Settings</h2>
        <button
          onClick={loadEmulators}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm"
        >
          <RefreshCw size={16} className={loading ? 'spinner' : ''} />
          Re-detect All
        </button>
      </div>

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
                  <h3 className="font-semibold text-lg">{emu.name}</h3>
                  <p className="text-surface-400 text-sm">{getPlatformNames(emu.platforms)}</p>
                </div>
                <span className={`flex items-center gap-1 text-sm ${
                  emu.installed ? 'text-green-400' : 'text-surface-400'
                }`}>
                  {emu.installed ? <Check size={16} /> : <X size={16} />}
                  {emu.installed ? 'Installed' : 'Not Installed'}
                </span>
              </div>

              {emu.path && (
                <div className="flex items-center gap-2 text-sm text-surface-400 mb-3">
                  <span className="font-mono truncate">{emu.path}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleBrowse(emu.id)}
                  className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm"
                >
                  Browse
                </button>
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
    const path = await window.electronAPI.dialog.openDirectory()
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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [preferredRegion, setPreferredRegion] = useState('us')
  const [autoScrape, setAutoScrape] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addToast } = useUIStore()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const config = await window.electronAPI.config.getAll() as Record<string, unknown>
        setUsername((config.screenScraperUsername as string) || '')
        setPassword((config.screenScraperPassword as string) || '')
        setPreferredRegion((config.preferredRegion as string) || 'us')
        setAutoScrape(config.autoScrape !== false)
      } catch (error) {
        console.error('Failed to load metadata settings:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await window.electronAPI.config.set('screenScraperUsername', username)
      await window.electronAPI.config.set('screenScraperPassword', password)
      await window.electronAPI.config.set('preferredRegion', preferredRegion)
      await window.electronAPI.config.set('autoScrape', autoScrape)
      addToast('success', 'Metadata settings saved')
    } catch (error) {
      console.error('Failed to save settings:', error)
      addToast('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleClearCache = async () => {
    try {
      const coversPath = await window.electronAPI.config.get('coversPath') as string
      if (coversPath) {
        await window.electronAPI.shell.openPath(coversPath)
        addToast('info', 'Opened covers folder - delete files manually to clear cache')
      }
    } catch (error) {
      addToast('error', 'Failed to open covers folder')
    }
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
        <h3 className="text-lg font-semibold mb-4">ScreenScraper Credentials</h3>
        <p className="text-surface-400 mb-4">
          Optional: Enter your ScreenScraper credentials for faster scraping (free account available).
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2"
              placeholder="Username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2"
              placeholder="Password"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Preferences</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Preferred Region</label>
          <select
            value={preferredRegion}
            onChange={e => setPreferredRegion(e.target.value)}
            className="bg-surface-800 border border-surface-700 rounded px-3 py-2"
          >
            <option value="us">United States (US)</option>
            <option value="eu">Europe (EU)</option>
            <option value="jp">Japan (JP)</option>
            <option value="wor">World</option>
          </select>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScrape}
            onChange={e => setAutoScrape(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <span>Auto-scrape metadata when adding games</span>
        </label>
      </section>

      <section className="mb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <div className="flex gap-3">
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg"
          >
            Clear Metadata Cache
          </button>
        </div>
      </section>
    </div>
  )
}

// Controllers Settings Section
function ControllersSettings() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Controller Settings</h2>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Detected Controllers</h3>
        <div className="bg-surface-800 rounded-lg p-4 text-center text-surface-400">
          No controllers detected. Connect a controller to configure it.
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">Global Mappings</h3>
        <p className="text-surface-400 mb-4">
          Configure keyboard shortcuts and controller mappings for app navigation.
        </p>
        <button className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg">
          Configure Mappings
        </button>
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
