import { useState, useEffect } from 'react'
import {
  Gamepad2,
  FolderPlus,
  Search,
  Download,
  HardDrive,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Loader2,
  FolderOpen
} from 'lucide-react'
import { useAppStore } from '../store/appStore'
import { useLibraryStore } from '../store/libraryStore'

type WizardStep = 'welcome' | 'folders' | 'emulators' | 'missing' | 'bios' | 'ready'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'folders', label: 'ROM Folders' },
  { id: 'emulators', label: 'Emulators' },
  { id: 'missing', label: 'Install' },
  { id: 'bios', label: 'BIOS' },
  { id: 'ready', label: 'Ready' }
]

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome')
  const { setFirstRun } = useAppStore()
  const { romFolders, addRomFolder, removeRomFolder, loadLibrary } = useLibraryStore()

  // Load saved ROM folders on mount
  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  const currentIndex = STEPS.findIndex(s => s.id === currentStep)

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id)
    }
  }

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id)
    }
  }

  const finishSetup = () => {
    setFirstRun(false)
  }

  return (
    <div className="h-screen w-screen bg-surface-950 flex flex-col">
      {/* Progress bar */}
      <div className="flex items-center justify-center gap-2 py-6 px-8">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                index < currentIndex
                  ? 'bg-accent text-white'
                  : index === currentIndex
                  ? 'bg-accent text-white'
                  : 'bg-surface-800 text-surface-400'
              }`}
            >
              {index < currentIndex ? <Check size={16} /> : index + 1}
            </div>
            <span className={`ml-2 text-sm hidden sm:inline ${
              index === currentIndex ? 'text-white' : 'text-surface-400'
            }`}>
              {step.label}
            </span>
            {index < STEPS.length - 1 && (
              <ChevronRight size={16} className="mx-3 text-surface-600" />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {currentStep === 'welcome' && <WelcomeStep />}
          {currentStep === 'folders' && (
            <FoldersStep
              folders={romFolders}
              onAdd={addRomFolder}
              onRemove={removeRomFolder}
            />
          )}
          {currentStep === 'emulators' && <EmulatorsStep />}
          {currentStep === 'missing' && <MissingStep />}
          {currentStep === 'bios' && <BiosStep />}
          {currentStep === 'ready' && <ReadyStep />}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between p-8">
        <button
          onClick={goBack}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-6 py-3 bg-surface-800 hover:bg-surface-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={20} />
          Back
        </button>

        {currentStep === 'ready' ? (
          <button
            onClick={finishSetup}
            className="flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent-hover rounded-lg font-semibold"
          >
            Get Started
            <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover rounded-lg"
          >
            Next
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  )
}

function WelcomeStep() {
  return (
    <div className="text-center">
      <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Gamepad2 size={48} className="text-accent" />
      </div>
      <h1 className="text-4xl font-bold mb-4">Welcome to EasyEmu</h1>
      <p className="text-xl text-surface-300 mb-8">
        Your unified interface for playing emulated games across all gaming systems.
      </p>
      <div className="grid grid-cols-3 gap-6 text-center">
        <div className="bg-surface-800 rounded-lg p-6">
          <FolderPlus size={32} className="mx-auto mb-3 text-accent" />
          <h3 className="font-semibold mb-1">Organize</h3>
          <p className="text-sm text-surface-400">All your games in one place</p>
        </div>
        <div className="bg-surface-800 rounded-lg p-6">
          <Search size={32} className="mx-auto mb-3 text-accent" />
          <h3 className="font-semibold mb-1">Discover</h3>
          <p className="text-sm text-surface-400">Auto-fetch game artwork & info</p>
        </div>
        <div className="bg-surface-800 rounded-lg p-6">
          <Gamepad2 size={32} className="mx-auto mb-3 text-accent" />
          <h3 className="font-semibold mb-1">Play</h3>
          <p className="text-sm text-surface-400">Launch with one click</p>
        </div>
      </div>
    </div>
  )
}

function FoldersStep({
  folders,
  onAdd,
  onRemove
}: {
  folders: string[]
  onAdd: (path: string) => void
  onRemove: (path: string) => void
}) {
  const handleAddFolder = async () => {
    const path = await window.electronAPI.dialog.openDirectory()
    if (path) {
      onAdd(path)
    }
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-4 text-center">Where are your games?</h2>
      <p className="text-surface-300 text-center mb-8">
        Add folders containing your ROM files. You can add more folders later in Settings.
      </p>

      <div className="bg-surface-800 rounded-lg p-6 mb-6 min-h-[200px]">
        {folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-surface-400">
            <FolderPlus size={48} className="mb-4 opacity-50" />
            <p>No folders added yet</p>
            <p className="text-sm">Click the button below to add a folder</p>
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map(folder => (
              <div
                key={folder}
                className="flex items-center justify-between bg-surface-900 rounded px-4 py-3"
              >
                <span className="font-mono text-sm truncate">{folder}</span>
                <button
                  onClick={() => onRemove(folder)}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded ml-4"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleAddFolder}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-accent hover:bg-accent-hover rounded-lg text-lg"
      >
        <Plus size={24} />
        Add ROM Folder
      </button>
    </div>
  )
}

function EmulatorsStep() {
  const [emulators, setEmulators] = useState<EmulatorInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const detectEmulators = async () => {
      try {
        const results = await window.electronAPI.emulators.detect()
        // Sort: installed first, then alphabetically
        const sorted = [...results].sort((a, b) => {
          if (a.installed !== b.installed) return a.installed ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        setEmulators(sorted)
      } catch (error) {
        console.error('Failed to detect emulators:', error)
      } finally {
        setLoading(false)
      }
    }
    detectEmulators()
  }, [])

  const handleBrowse = async (emulatorId: string) => {
    const path = await window.electronAPI.dialog.openFile([
      { name: 'Executable', extensions: ['exe', 'app', ''] }
    ])
    if (path) {
      await window.electronAPI.emulators.configure(emulatorId, { path })
      // Re-detect to update the list
      const results = await window.electronAPI.emulators.detect()
      const sorted = [...results].sort((a, b) => {
        if (a.installed !== b.installed) return a.installed ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      setEmulators(sorted)
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <Search size={48} className="mx-auto mb-4 text-accent" />
        <h2 className="text-3xl font-bold mb-4">Emulator Detection</h2>
        <p className="text-surface-300">
          We've scanned your system for installed emulators.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={48} className="animate-spin text-accent mb-4" />
          <p className="text-surface-400">Scanning for emulators...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emulators.map(emu => (
            <div
              key={emu.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                emu.installed ? 'bg-green-500/10 border border-green-500/30' : 'bg-surface-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{emu.name}</h3>
                {emu.path && (
                  <p className="text-sm text-surface-400 font-mono truncate">{emu.path}</p>
                )}
                <p className="text-xs text-surface-500">{emu.platforms.join(', ')}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className={`flex items-center gap-1 ${
                  emu.installed ? 'text-green-400' : 'text-surface-400'
                }`}>
                  {emu.installed ? (
                    <>
                      <Check size={18} />
                      Detected
                    </>
                  ) : (
                    'Not Found'
                  )}
                </span>
                <button
                  onClick={() => handleBrowse(emu.id)}
                  className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm flex items-center gap-1"
                >
                  <FolderOpen size={14} />
                  Browse
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MissingStep() {
  const [missingEmulators, setMissingEmulators] = useState<EmulatorInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMissing = async () => {
      try {
        const results = await window.electronAPI.emulators.detect()
        const missing = results.filter(e => !e.installed)
        setMissingEmulators(missing)
      } catch (error) {
        console.error('Failed to detect emulators:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMissing()
  }, [])

  const handleDownload = async (url: string) => {
    await window.electronAPI.shell.openExternal(url)
  }

  const handleBrowse = async (emulatorId: string) => {
    const path = await window.electronAPI.dialog.openFile([
      { name: 'Executable', extensions: ['exe', 'app', ''] }
    ])
    if (path) {
      await window.electronAPI.emulators.configure(emulatorId, { path })
      // Re-detect to update the list
      const results = await window.electronAPI.emulators.detect()
      const missing = results.filter(e => !e.installed)
      setMissingEmulators(missing)
    }
  }

  const getPlatformDescription = (platforms: string[]): string => {
    const platformNames: Record<string, string> = {
      nes: 'NES',
      snes: 'SNES',
      n64: 'N64',
      gb: 'Game Boy',
      gbc: 'Game Boy Color',
      gba: 'GBA',
      nds: 'Nintendo DS',
      gamecube: 'GameCube',
      wii: 'Wii',
      switch: 'Switch',
      genesis: 'Genesis',
      ps1: 'PlayStation',
      ps2: 'PS2',
      ps3: 'PS3',
      psp: 'PSP',
      arcade: 'Arcade'
    }
    return platforms.map(p => platformNames[p] || p).join(' / ')
  }

  return (
    <div>
      <div className="text-center mb-8">
        <Download size={48} className="mx-auto mb-4 text-accent" />
        <h2 className="text-3xl font-bold mb-4">Install Missing Emulators</h2>
        <p className="text-surface-300">
          Download emulators or browse to locate them manually.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={48} className="animate-spin text-accent mb-4" />
          <p className="text-surface-400">Checking emulators...</p>
        </div>
      ) : missingEmulators.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-green-500/10 border border-green-500/30 rounded-lg">
          <Check size={48} className="text-green-400 mb-4" />
          <h3 className="text-xl font-semibold text-green-400 mb-2">All Emulators Detected!</h3>
          <p className="text-surface-300">You have all supported emulators installed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {missingEmulators.map(emu => (
            <div
              key={emu.id}
              className="flex items-center justify-between bg-surface-800 p-4 rounded-lg"
            >
              <div>
                <h3 className="font-semibold">{emu.name}</h3>
                <p className="text-sm text-surface-400">{getPlatformDescription(emu.platforms)}</p>
              </div>
              <div className="flex gap-2">
                {emu.downloadUrl && (
                  <button
                    onClick={() => handleDownload(emu.downloadUrl!)}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover rounded text-sm flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download
                  </button>
                )}
                <button
                  onClick={() => handleBrowse(emu.id)}
                  className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded text-sm flex items-center gap-2"
                >
                  <FolderOpen size={16} />
                  Browse
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BiosStep() {
  const [biosFiles, setBiosFiles] = useState<BiosStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBiosStatus = async () => {
      try {
        const status = await window.electronAPI.bios.checkStatus()
        setBiosFiles(status)
      } catch (error) {
        console.error('Failed to load BIOS status:', error)
      } finally {
        setLoading(false)
      }
    }
    loadBiosStatus()
  }, [])

  const handleBrowse = async (biosId: string) => {
    const path = await window.electronAPI.dialog.openFile([
      { name: 'BIOS Files', extensions: ['bin', 'rom', 'BIN', 'ROM'] }
    ])
    if (path) {
      const updatedStatus = await window.electronAPI.bios.setPath(biosId, path)
      setBiosFiles(updatedStatus)
    }
  }

  return (
    <div>
      <div className="text-center mb-8">
        <HardDrive size={48} className="mx-auto mb-4 text-accent" />
        <h2 className="text-3xl font-bold mb-4">BIOS Files</h2>
        <p className="text-surface-300">
          Some emulators require BIOS files to run. These must be obtained from your own consoles.
        </p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-sm text-yellow-200">
        BIOS files are copyrighted and cannot be included with EasyEmu. You'll need to dump them from your own hardware.
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={48} className="animate-spin text-accent mb-4" />
          <p className="text-surface-400">Checking BIOS files...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {biosFiles.map(bios => (
            <div
              key={bios.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                bios.found ? 'bg-green-500/10 border border-green-500/30' : 'bg-surface-800'
              }`}
            >
              <div className="flex-1 min-w-0">
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
                <p className="text-sm text-surface-400">{bios.description}</p>
                {bios.path && (
                  <p className="text-xs text-surface-500 font-mono truncate mt-1">{bios.path}</p>
                )}
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className={`flex items-center gap-1 ${bios.found ? 'text-green-400' : 'text-surface-400'}`}>
                  {bios.found ? (
                    <>
                      <Check size={16} />
                      Found
                    </>
                  ) : (
                    'Missing'
                  )}
                </span>
                <button
                  onClick={() => handleBrowse(bios.id)}
                  className="px-3 py-1.5 bg-surface-700 hover:bg-surface-600 rounded text-sm flex items-center gap-1"
                >
                  <FolderOpen size={14} />
                  Browse
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReadyStep() {
  return (
    <div className="text-center">
      <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check size={48} className="text-green-400" />
      </div>
      <h2 className="text-3xl font-bold mb-4">You're All Set!</h2>
      <p className="text-xl text-surface-300 mb-8">
        EasyEmu is ready to use. Your library will be scanned and you can start playing.
      </p>

      <div className="bg-surface-800 rounded-lg p-6 text-left">
        <h3 className="font-semibold mb-3">What's next:</h3>
        <ul className="space-y-2 text-surface-300">
          <li className="flex items-center gap-2">
            <Check size={16} className="text-accent" />
            Your ROM folders will be scanned automatically
          </li>
          <li className="flex items-center gap-2">
            <Check size={16} className="text-accent" />
            Game metadata and artwork will be fetched
          </li>
          <li className="flex items-center gap-2">
            <Check size={16} className="text-accent" />
            Click any game to start playing!
          </li>
        </ul>
      </div>
    </div>
  )
}
