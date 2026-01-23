import { useState } from 'react'
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
  AlertCircle
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useLibraryStore } from '../store/libraryStore'

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

  const handleAddFolder = async () => {
    const path = await window.electronAPI.dialog.openDirectory()
    if (path) {
      addRomFolder(path)
    }
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
                    onClick={() => removeRomFolder(folder)}
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
            onClick={() => scanLibrary()}
            disabled={isScanning || romFolders.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={isScanning ? 'spinner' : ''} />
            {isScanning ? 'Scanning...' : 'Rescan Library'}
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">Scan Options</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" defaultChecked className="w-4 h-4 accent-accent" />
          <span>Scan subfolders recursively</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer mt-2">
          <input type="checkbox" className="w-4 h-4 accent-accent" />
          <span>Include hidden folders</span>
        </label>
      </section>
    </div>
  )
}

// Emulators Settings Section
function EmulatorsSettings() {
  const emulators = [
    { id: 'retroarch', name: 'RetroArch', platforms: ['Multi-system'], status: 'detected', path: 'C:\\RetroArch\\retroarch.exe' },
    { id: 'dolphin', name: 'Dolphin', platforms: ['GameCube', 'Wii'], status: 'not_installed', path: null },
    { id: 'pcsx2', name: 'PCSX2', platforms: ['PS2'], status: 'not_installed', path: null },
    { id: 'rpcs3', name: 'RPCS3', platforms: ['PS3'], status: 'not_installed', path: null },
    { id: 'duckstation', name: 'DuckStation', platforms: ['PS1'], status: 'detected', path: 'C:\\DuckStation\\duckstation-qt-x64.exe' },
    { id: 'ryujinx', name: 'Ryujinx', platforms: ['Switch'], status: 'not_installed', path: null }
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Emulator Settings</h2>

      <div className="space-y-4">
        {emulators.map(emu => (
          <div key={emu.id} className="bg-surface-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{emu.name}</h3>
                <p className="text-surface-400 text-sm">{emu.platforms.join(', ')}</p>
              </div>
              <span className={`flex items-center gap-1 text-sm ${
                emu.status === 'detected' ? 'text-green-400' : 'text-surface-400'
              }`}>
                {emu.status === 'detected' ? <Check size={16} /> : <X size={16} />}
                {emu.status === 'detected' ? 'Installed' : 'Not Installed'}
              </span>
            </div>

            {emu.path && (
              <div className="flex items-center gap-2 text-sm text-surface-400 mb-3">
                <span className="font-mono truncate">{emu.path}</span>
              </div>
            )}

            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm">
                Browse
              </button>
              {emu.status === 'not_installed' && (
                <button className="px-3 py-1.5 bg-accent hover:bg-accent-hover rounded text-sm">
                  Install
                </button>
              )}
              <button className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm">
                Re-detect
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// BIOS Settings Section
function BiosSettings() {
  const biosFiles = [
    { id: 'ps1_bios', name: 'PS1 BIOS', required: true, status: 'missing', path: null },
    { id: 'ps2_bios', name: 'PS2 BIOS', required: true, status: 'missing', path: null },
    { id: 'gba_bios', name: 'GBA BIOS', required: false, status: 'found', path: 'C:\\EasyEmu\\bios\\gba_bios.bin' }
  ]

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

      <div className="space-y-4">
        {biosFiles.map(bios => (
          <div key={bios.id} className="bg-surface-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{bios.name}</h3>
                {bios.required && (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                    Required
                  </span>
                )}
              </div>
              <span className={`flex items-center gap-1 text-sm ${
                bios.status === 'found' ? 'text-green-400' : 'text-red-400'
              }`}>
                {bios.status === 'found' ? <Check size={16} /> : <X size={16} />}
                {bios.status === 'found' ? 'Found' : 'Missing'}
              </span>
            </div>

            {bios.path && (
              <p className="text-surface-400 text-sm font-mono truncate mb-3">{bios.path}</p>
            )}

            <button className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm">
              Browse
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Paths Settings Section
function PathsSettings() {
  const paths = [
    { id: 'saves', label: 'Save Data', path: 'C:\\Users\\User\\AppData\\Roaming\\EasyEmu\\saves' },
    { id: 'states', label: 'Save States', path: 'C:\\Users\\User\\AppData\\Roaming\\EasyEmu\\states' },
    { id: 'screenshots', label: 'Screenshots', path: 'C:\\Users\\User\\AppData\\Roaming\\EasyEmu\\screenshots' },
    { id: 'covers', label: 'Cover Art', path: 'C:\\Users\\User\\AppData\\Roaming\\EasyEmu\\covers' }
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Paths</h2>

      <div className="space-y-4">
        {paths.map(item => (
          <div key={item.id} className="bg-surface-800 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">{item.label}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={item.path}
                readOnly
                className="flex-1 bg-surface-900 border border-surface-700 rounded px-3 py-2 text-sm font-mono"
              />
              <button className="px-3 py-2 bg-surface-700 hover:bg-surface-600 rounded text-sm">
                Browse
              </button>
              <button
                onClick={() => window.electronAPI.shell.openPath(item.path)}
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
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Metadata Settings</h2>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">ScreenScraper Credentials</h3>
        <p className="text-surface-400 mb-4">
          Optional: Enter your ScreenScraper credentials for faster scraping (free account available).
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2"
              placeholder="Username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2"
              placeholder="Password"
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Preferences</h3>
        <div>
          <label className="block text-sm font-medium mb-2">Preferred Region</label>
          <select className="bg-surface-800 border border-surface-700 rounded px-3 py-2">
            <option value="us">United States (US)</option>
            <option value="eu">Europe (EU)</option>
            <option value="jp">Japan (JP)</option>
            <option value="wor">World</option>
          </select>
        </div>
        <label className="flex items-center gap-3 cursor-pointer mt-4">
          <input type="checkbox" defaultChecked className="w-4 h-4 accent-accent" />
          <span>Auto-scrape metadata when adding games</span>
        </label>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg">
            Re-scrape All Games
          </button>
          <button className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg">
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">General Settings</h2>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Startup</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-accent" />
          <span>Start minimized to system tray</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer mt-2">
          <input type="checkbox" defaultChecked className="w-4 h-4 accent-accent" />
          <span>Check for updates on startup</span>
        </label>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Updates</h3>
        <p className="text-surface-400 mb-4">Current version: 0.1.0</p>
        <button className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg">
          Check for Updates
        </button>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4">Reset</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setFirstRun(true)}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg"
          >
            Re-run Setup Wizard
          </button>
          <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg">
            Reset to Defaults
          </button>
        </div>
      </section>
    </div>
  )
}
