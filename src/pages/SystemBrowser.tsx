import { useCallback, useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { Check, X, FolderOpen, Download, Loader2, Trash2, Settings2 } from 'lucide-react'
import { useLibraryStore } from '../store/libraryStore'
import { useUIStore } from '../store/uiStore'
import { useEmulatorStore } from '../store/emulatorStore'
import { PLATFORMS } from '../constants/platforms'
import { getPlatformImageUrl } from '../constants/platformImages'
import GameCard from '../components/GameCard'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import { useLayoutContext } from '../components/Layout'
import type { EmulatorInfo, CoreDownloadProgress } from '../types'

interface BiosStatus {
  id: string
  name: string
  description: string
  platform: string
  required: boolean
  found: boolean
  path: string | null
}

// Represents a focusable requirement row (emulator, BIOS file, or embedded core)
interface RequirementItem {
  type: 'emulator' | 'bios' | 'core'
  id: string
  name: string
  installed: boolean
  required: boolean
  path: string | null
  platforms?: string[]
  downloadUrl?: string | null
}

export default function SystemBrowser() {
  const { platform } = useParams<{ platform?: string }>()
  const { games } = useLibraryStore()
  const { addToast } = useUIStore()
  const {
    availableCores,
    downloadingCores,
    loadCores,
    downloadCore,
    deleteCore,
    setDownloadProgress
  } = useEmulatorStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { isSidebarFocused, setIsSidebarFocused } = useLayoutContext()
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(0)
  const justNavigatedRef = useRef(false)
  const [deletingCore, setDeletingCore] = useState<string | null>(null)

  // Requirements data for platform view
  const [emulators, setEmulators] = useState<EmulatorInfo[]>([])
  const [biosFiles, setBiosFiles] = useState<BiosStatus[]>([])

  // Default emulator selector state
  const [defaults, setDefaults] = useState<Record<string, string>>({})
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [defaultDropdownOpen, setDefaultDropdownOpen] = useState(false)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)

  // Group games by platform
  const gamesByPlatform = games.reduce((acc, game) => {
    if (!acc[game.platform]) {
      acc[game.platform] = []
    }
    acc[game.platform].push(game)
    return acc
  }, {} as Record<string, typeof games>)

  const platformInfo = platform ? PLATFORMS.find(p => p.id === platform) : null

  // Filter emulators to only those listed in the platform's emulators array
  const platformEmulators = platformInfo
    ? emulators.filter(e => platformInfo.emulators.includes(e.id))
    : []
  const platformBios = biosFiles.filter(b => b.platform === platform)
  const platformCores = platform
    ? availableCores.filter(c => c.platforms.includes(platform))
    : []

  // Installed + enabled emulators for this platform (for default selector)
  const installedForPlatform = platformInfo
    ? emulators.filter(e => platformInfo.emulators.includes(e.id) && e.installed && enabled[e.id] !== false)
    : []
  const showDefaultSelector = installedForPlatform.length > 1

  // Options for default emulator dropdown
  const defaultOptions = [
    { id: '', name: 'Default (first installed)' },
    ...installedForPlatform.map(e => ({ id: e.id, name: e.name }))
  ]

  // Build unified requirement items list
  const requirementItems: RequirementItem[] = [
    ...platformEmulators.map(e => ({
      type: 'emulator' as const,
      id: e.id,
      name: e.name,
      installed: e.installed,
      required: true,
      path: e.path,
      platforms: e.platforms,
      downloadUrl: e.downloadUrl
    })),
    ...platformCores.map(c => ({
      type: 'core' as const,
      id: c.id,
      name: c.name,
      installed: c.installed,
      required: false,
      path: null
    })),
    ...platformBios.map(b => ({
      type: 'bios' as const,
      id: b.id,
      name: b.name,
      installed: b.found,
      required: b.required,
      path: b.path
    }))
  ]

  // The default selector occupies one focusable slot at the end of the requirements zone
  const reqCount = requirementItems.length + (showDefaultSelector ? 1 : 0)
  const defaultSelectorIndex = showDefaultSelector ? requirementItems.length : -1

  // Count actionable buttons per requirement item for left/right navigation
  const getButtonCount = useCallback((item: RequirementItem): number => {
    if (item.type === 'core') return 1 // Install or Remove
    if (item.type === 'bios') return 1 // Browse
    // Emulator: "Open Settings" or "Download" (if applicable) + "Browse"
    if (item.installed) return 2 // Open Settings + Browse
    if (item.downloadUrl) return 2 // Download + Browse
    return 1 // Browse only
  }, [])

  // Load emulator + BIOS + cores status + config when platform changes
  useEffect(() => {
    if (!platform) return
    const load = async () => {
      try {
        const [emuResults, biosResults, config] = await Promise.all([
          window.electronAPI.emulators.detect(),
          window.electronAPI.bios.checkStatus(),
          window.electronAPI.config.getAll() as Promise<Record<string, unknown>>
        ])
        setEmulators(emuResults)
        setBiosFiles(biosResults)
        setDefaults((config.defaultEmulatorPerPlatform as Record<string, string>) || {})
        setEnabled((config.emulatorEnabled as Record<string, boolean>) || {})
      } catch (err) {
        console.error('Failed to load system requirements:', err)
      }
    }
    load()
    loadCores()
  }, [platform, loadCores])

  // Listen for core download progress events
  useEffect(() => {
    const unsubscribe = window.electronAPI.cores.onDownloadProgress((progress: CoreDownloadProgress) => {
      setDownloadProgress(progress.coreId, progress)
      if (progress.status === 'complete') {
        addToast('success', `Core installed successfully`)
        loadCores()
      } else if (progress.status === 'error') {
        addToast('error', `Failed to install core: ${progress.error}`)
      }
    })
    return unsubscribe
  }, [setDownloadProgress, addToast, loadCores])

  // Get current items (platforms or games)
  const platformGames = platform ? (gamesByPlatform[platform] || []) : []
  const currentItems = platform ? platformGames : PLATFORMS

  // Reset focus when platform changes
  useEffect(() => {
    setFocusedIndex(0)
  }, [platform])

  // Track when we just navigated to this page to prevent auto-selection
  useEffect(() => {
    if (!platform && location.pathname === '/systems') {
      justNavigatedRef.current = true
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
    if (typeof window === 'undefined') return 6
    const width = window.innerWidth
    if (width >= 1536) return 6
    if (width >= 1280) return 6
    if (width >= 1024) return 5
    if (width >= 768) return 4
    if (width >= 640) return 3
    return 2
  }, [])

  // Browse for emulator path
  const handleBrowseEmulator = useCallback(async (emulatorId: string) => {
    const path = await window.electronAPI.dialog.openFile([
      { name: 'Executables', extensions: ['exe', 'app', 'AppImage', 'sh'] }
    ])
    if (path) {
      await window.electronAPI.emulators.configure(emulatorId, { path })
      const updated = await window.electronAPI.emulators.detect()
      setEmulators(updated)
      addToast('success', 'Emulator path updated')
    }
  }, [addToast])

  // Download or delete an embedded core
  const handleCoreAction = useCallback(async (coreId: string, installed: boolean) => {
    if (installed) {
      setDeletingCore(coreId)
      try {
        await deleteCore(coreId)
        addToast('success', 'Core removed')
      } catch {
        addToast('error', 'Failed to remove core')
      } finally {
        setDeletingCore(null)
      }
    } else {
      try {
        await downloadCore(coreId)
      } catch (error) {
        addToast('error', `Failed to download: ${(error as Error).message}`)
      }
    }
  }, [deleteCore, downloadCore, addToast])

  // Browse for BIOS file
  const handleBrowseBios = useCallback(async (biosId: string) => {
    const path = await window.electronAPI.dialog.openFile([
      { name: 'BIOS Files', extensions: ['bin', 'rom', 'BIN', 'ROM', 'qcow2', 'img', 'iso'] }
    ])
    if (path) {
      const updatedStatus = await window.electronAPI.bios.setPath(biosId, path)
      setBiosFiles(updatedStatus)
      addToast('success', 'BIOS path updated')
    }
  }, [addToast])

  // Open emulator settings (launch emulator without a ROM)
  const handleOpenSettings = useCallback(async (emulatorId: string) => {
    try {
      await window.electronAPI.emulators.openSettings(emulatorId)
    } catch {
      addToast('error', 'Failed to open emulator settings')
    }
  }, [addToast])

  // Change default emulator for this platform
  const handleDefaultChange = useCallback(async (emulatorId: string) => {
    if (!platform) return
    const value = emulatorId === '' ? undefined : emulatorId
    const next = value ? { ...defaults, [platform]: value } : (() => {
      const o = { ...defaults }
      delete o[platform]
      return o
    })()
    setDefaults(next)
    await window.electronAPI.config.set('defaultEmulatorPerPlatform', next)
    addToast('success', 'Default emulator updated')
  }, [platform, defaults, addToast])

  // Handle gamepad navigation
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (isSidebarFocused) return

    // If default emulator dropdown is open, navigate within it
    if (defaultDropdownOpen) {
      if (direction === 'up') {
        setSelectedOptionIndex(prev => Math.max(0, prev - 1))
      } else if (direction === 'down') {
        setSelectedOptionIndex(prev => Math.min(defaultOptions.length - 1, prev + 1))
      }
      return
    }

    const columns = getColumns()
    let shouldMoveToSidebar = false
    let newIndex = focusedIndex

    if (platform) {
      // Platform view: requirements zone (negative indices mapped to 0..reqCount-1)
      // then game grid (reqCount..reqCount+games-1)
      const totalFocusable = reqCount + platformGames.length
      if (totalFocusable === 0) return

      const inReqZone = focusedIndex < reqCount

      if (inReqZone) {
        // Navigating requirement items (vertical list with horizontal button nav)
        const item = focusedIndex < requirementItems.length ? requirementItems[focusedIndex] : null
        const btnCount = item ? getButtonCount(item) : 1
        switch (direction) {
          case 'left':
            if (focusedButtonIndex > 0) {
              setFocusedButtonIndex(focusedButtonIndex - 1)
            } else {
              shouldMoveToSidebar = true
            }
            break
          case 'right':
            if (focusedButtonIndex < btnCount - 1) {
              setFocusedButtonIndex(focusedButtonIndex + 1)
            }
            break
          case 'up':
            if (focusedIndex > 0) {
              newIndex = focusedIndex - 1
              setFocusedButtonIndex(0)
            }
            break
          case 'down':
            if (focusedIndex < totalFocusable - 1) {
              newIndex = focusedIndex + 1
              setFocusedButtonIndex(0)
            }
            break
        }
      } else {
        // Navigating game grid
        const gridIndex = focusedIndex - reqCount
        const totalGames = platformGames.length
        switch (direction) {
          case 'left':
            if (gridIndex % columns === 0) {
              shouldMoveToSidebar = true
            } else {
              newIndex = focusedIndex - 1
            }
            break
          case 'right':
            if (gridIndex < totalGames - 1) {
              newIndex = focusedIndex + 1
            }
            break
          case 'up':
            if (gridIndex - columns >= 0) {
              newIndex = focusedIndex - columns
            } else {
              // Move into requirements zone (last item) or stay
              if (reqCount > 0) {
                newIndex = reqCount - 1
                setFocusedButtonIndex(0)
              }
            }
            break
          case 'down':
            if (gridIndex + columns < totalGames) {
              newIndex = focusedIndex + columns
            }
            break
        }
      }

      if (shouldMoveToSidebar) {
        setIsSidebarFocused(true)
      } else {
        setFocusedIndex(Math.max(0, Math.min(newIndex, totalFocusable - 1)))
      }
    } else {
      // Platforms overview grid
      const totalItems = currentItems.length
      if (totalItems === 0) return

      switch (direction) {
        case 'left':
          if (focusedIndex % columns === 0) {
            shouldMoveToSidebar = true
          } else {
            newIndex = focusedIndex - 1
          }
          break
        case 'right':
          if (focusedIndex < totalItems - 1) {
            newIndex = focusedIndex + 1
          }
          break
        case 'up':
          if (focusedIndex - columns >= 0) {
            newIndex = focusedIndex - columns
          } else {
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

      if (shouldMoveToSidebar) {
        setIsSidebarFocused(true)
      } else {
        setFocusedIndex(Math.max(0, Math.min(newIndex, totalItems - 1)))
      }
    }
  }, [isSidebarFocused, platform, currentItems.length, platformGames.length, reqCount, getColumns, focusedIndex, setIsSidebarFocused, defaultDropdownOpen, defaultOptions.length, focusedButtonIndex, requirementItems, getButtonCount])

  const handleConfirm = useCallback(() => {
    if (isSidebarFocused) return

    // If default emulator dropdown is open, confirm selection
    if (defaultDropdownOpen) {
      const selectedOption = defaultOptions[selectedOptionIndex]
      if (selectedOption) {
        handleDefaultChange(selectedOption.id)
      }
      setDefaultDropdownOpen(false)
      setSelectedOptionIndex(0)
      return
    }

    if (platform) {
      // Platform view
      if (focusedIndex === defaultSelectorIndex) {
        // Open the default emulator dropdown
        const currentValue = defaults[platform] ?? ''
        const currentIdx = defaultOptions.findIndex(o => o.id === currentValue)
        setSelectedOptionIndex(currentIdx >= 0 ? currentIdx : 0)
        setDefaultDropdownOpen(true)
      } else if (focusedIndex < requirementItems.length) {
        // Confirm on a requirement item → trigger focused button action
        const item = requirementItems[focusedIndex]
        if (item.type === 'emulator') {
          if (item.installed) {
            // Buttons: [Open Settings, Browse]
            if (focusedButtonIndex === 0) handleOpenSettings(item.id)
            else handleBrowseEmulator(item.id)
          } else if (item.downloadUrl) {
            // Buttons: [Download, Browse]
            if (focusedButtonIndex === 0) window.electronAPI.shell.openExternal(item.downloadUrl)
            else handleBrowseEmulator(item.id)
          } else {
            // Buttons: [Browse]
            handleBrowseEmulator(item.id)
          }
        } else if (item.type === 'core') {
          handleCoreAction(item.id, item.installed)
        } else {
          handleBrowseBios(item.id)
        }
      } else {
        // Confirm on a game → navigate
        const gameIndex = focusedIndex - reqCount
        const game = platformGames[gameIndex]
        if (game) {
          navigate(`/game/${game.id}`)
        }
      }
    } else {
      if (justNavigatedRef.current) return
      const platformItem = currentItems[focusedIndex] as typeof PLATFORMS[0]
      if (platformItem) {
        navigate(`/systems/${platformItem.id}`)
      }
    }
  }, [isSidebarFocused, focusedIndex, platform, reqCount, requirementItems, platformGames, currentItems, navigate, handleBrowseEmulator, handleBrowseBios, handleCoreAction, defaultDropdownOpen, defaultOptions, selectedOptionIndex, handleDefaultChange, defaults, defaultSelectorIndex, focusedButtonIndex, handleOpenSettings])

  const handleBack = useCallback(() => {
    if (isSidebarFocused) return
    if (defaultDropdownOpen) {
      setDefaultDropdownOpen(false)
      setSelectedOptionIndex(0)
      return
    }
    if (platform) {
      navigate('/systems')
    } else {
      setIsSidebarFocused(true)
    }
  }, [isSidebarFocused, platform, navigate, setIsSidebarFocused, defaultDropdownOpen])

  // Gamepad navigation (only when page is focused)
  useGamepadNavigation({
    enabled: !isSidebarFocused,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  // If specific platform selected, show games for that platform
  if (platform) {
    return (
      <div className="h-full overflow-auto">
        <div className="px-6 py-4 border-b border-surface-800">
          <Link to="/systems" className="text-accent hover:underline text-sm mb-2 inline-block">
            ← All Consoles
          </Link>
          <div className="flex items-center gap-3">
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
            <div>
              <p className="text-surface-400 text-sm">{platformGames.length} {platformGames.length === 1 ? 'game' : 'games'}</p>
            </div>
          </div>
        </div>

        {/* System Requirements Section */}
        {reqCount > 0 && (
          <div className="px-6 py-4 border-b border-surface-800 space-y-2">
            <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wide mb-2">System Requirements</h2>

            {requirementItems.map((item, index) => {
              const isFocused = !isSidebarFocused && focusedIndex === index
              const coreProgress = item.type === 'core' ? downloadingCores[item.id] : undefined
              const isDownloading = coreProgress && (coreProgress.status === 'downloading' || coreProgress.status === 'verifying')
              // Track which button index each rendered button maps to
              let btnIdx = 0
              const isBtnFocused = (bi: number) => isFocused && focusedButtonIndex === bi
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className={`flex items-center justify-between bg-surface-800 rounded-lg px-4 py-2.5 transition-all ${
                    isFocused ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex items-center gap-1 text-sm ${
                      item.installed ? 'text-green-400' : item.type === 'core' ? 'text-surface-400' : 'text-red-400'
                    }`}>
                      {item.installed ? <Check size={16} /> : item.type === 'core' ? (
                        isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />
                      ) : <X size={16} />}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                          item.type === 'core'
                            ? 'bg-accent/20 text-accent'
                            : item.type === 'bios' && item.required
                              ? 'bg-red-500/20 text-red-400'
                              : item.type === 'bios'
                                ? 'bg-surface-600 text-surface-300'
                                : 'bg-surface-600 text-surface-300'
                        }`}>
                          {item.type === 'core' ? 'Core' : item.type === 'bios' ? (item.required ? 'Required' : 'Optional') : 'Emulator'}
                        </span>
                      </div>
                      {item.path && (
                        <span className="text-surface-500 text-xs truncate">
                          <span className="font-bold">Path: </span>
                          <span className="font-mono">{item.path}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                  {item.type === 'emulator' && item.installed && (() => {
                    const bi = btnIdx++
                    return (
                      <button
                        onClick={() => handleOpenSettings(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                          isBtnFocused(bi)
                            ? 'bg-surface-600 text-white ring-2 ring-white/50'
                            : isFocused ? 'bg-surface-700 text-surface-400' : 'bg-surface-700 hover:bg-surface-600'
                        }`}
                      >
                        <Settings2 size={14} />
                        Open {item.name} Settings
                      </button>
                    )
                  })()}
                  {item.type === 'emulator' && !item.installed && item.downloadUrl && (() => {
                    const bi = btnIdx++
                    return (
                      <button
                        onClick={() => window.electronAPI.shell.openExternal(item.downloadUrl!)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
                          isBtnFocused(bi)
                            ? 'bg-accent text-white ring-2 ring-white/50'
                            : isFocused ? 'bg-accent/50 text-white/70' : 'bg-accent hover:bg-accent-hover'
                        }`}
                      >
                        <Download size={14} />
                        Download
                      </button>
                    )
                  })()}
                  {item.type === 'core' ? (() => {
                    const bi = btnIdx++
                    return item.installed ? (
                      <button
                        onClick={() => handleCoreAction(item.id, true)}
                        disabled={deletingCore === item.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all flex-shrink-0 ${
                          isBtnFocused(bi) ? 'bg-red-500/30 text-red-400 ring-2 ring-red-400/50' : 'hover:bg-red-500/20 hover:text-red-400 bg-surface-700'
                        }`}
                      >
                        {deletingCore === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCoreAction(item.id, false)}
                        disabled={!!isDownloading}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all flex-shrink-0 disabled:opacity-50 ${
                          isBtnFocused(bi) ? 'bg-accent text-white ring-2 ring-white/50' : 'bg-accent hover:bg-accent-hover'
                        }`}
                      >
                        {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        {isDownloading ? (coreProgress?.status === 'verifying' ? 'Verifying...' : `${coreProgress?.progress || 0}%`) : 'Install'}
                      </button>
                    )
                  })() : (() => {
                    const bi = btnIdx++
                    return (
                      <button
                        onClick={() => {
                          if (item.type === 'emulator') handleBrowseEmulator(item.id)
                          else handleBrowseBios(item.id)
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all flex-shrink-0 ${
                          isBtnFocused(bi)
                            ? 'bg-accent text-white ring-2 ring-white/50'
                            : isFocused ? 'bg-surface-700 text-surface-400' : 'bg-surface-700 hover:bg-surface-600'
                        }`}
                      >
                        <FolderOpen size={14} />
                        Browse
                      </button>
                    )
                  })()}
                  </div>
                </div>
              )
            })}

            {/* Default emulator selector */}
            {showDefaultSelector && (() => {
              const isFocused = !isSidebarFocused && focusedIndex === defaultSelectorIndex
              const currentEmulator = platform && defaults[platform] ? defaultOptions.find(e => e.id === defaults[platform]) : null
              const displayValue = currentEmulator?.name ?? 'Default (first installed)'

              return (
                <div
                  className={`bg-surface-800 rounded-lg px-4 py-2.5 transition-all ${
                    isFocused || defaultDropdownOpen ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Default Emulator</span>
                    {defaultDropdownOpen ? (
                      <div className="bg-surface-900 border border-accent rounded overflow-hidden min-w-[200px]">
                        {defaultOptions.map((opt, optIndex) => (
                          <div
                            key={opt.id}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                              optIndex === selectedOptionIndex
                                ? 'bg-accent text-white'
                                : 'hover:bg-surface-800'
                            }`}
                            onClick={() => {
                              handleDefaultChange(opt.id)
                              setDefaultDropdownOpen(false)
                              setSelectedOptionIndex(0)
                            }}
                          >
                            {opt.name}
                          </div>
                        ))}
                      </div>
                    ) : isFocused ? (
                      <div
                        className="flex items-center justify-between bg-surface-900 border border-accent rounded px-3 py-1.5 text-sm cursor-pointer min-w-[200px]"
                        onClick={() => {
                          const currentValue = platform ? (defaults[platform] ?? '') : ''
                          const currentIdx = defaultOptions.findIndex(o => o.id === currentValue)
                          setSelectedOptionIndex(currentIdx >= 0 ? currentIdx : 0)
                          setDefaultDropdownOpen(true)
                        }}
                      >
                        <span className="truncate">{displayValue}</span>
                        <span className="text-accent text-xs ml-2">Press A</span>
                      </div>
                    ) : (
                      <select
                        value={platform ? (defaults[platform] ?? '') : ''}
                        onChange={e => handleDefaultChange(e.target.value)}
                        className="bg-surface-900 border border-surface-700 rounded px-3 py-1.5 text-sm min-w-[200px]"
                      >
                        {defaultOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )
            })()}

            {platformInfo?.extensions && (
              <p className="text-surface-500 text-xs mt-2">
                <span className="font-bold">Supported Formats: </span>
                {platformInfo.extensions.join(', ')}
              </p>
            )}
          </div>
        )}

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
                  className={!isSidebarFocused && (index + reqCount) === focusedIndex ? 'ring-2 ring-accent rounded-lg' : ''}
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
        <h1 className="text-2xl font-bold">Consoles</h1>
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
