import { Routes, Route } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { useAppStore } from './store/appStore'
import { useLibraryStore } from './store/libraryStore'
import { useEmulatorStore } from './store/emulatorStore'
import { useInputStore } from './store/inputStore'
import Layout from './components/Layout'
import Library from './pages/Library'
import GameDetails from './pages/GameDetails'
import Settings from './pages/Settings'
import SystemBrowser from './pages/SystemBrowser'
import SetupWizard from './pages/SetupWizard'
import EmulatorView from './pages/EmulatorView'
import ToastContainer from './components/Toast'
import GamepadProvider from './components/GamepadProvider'
import BPLayout from './components/bigpicture/BPLayout'
import BPLibrary from './pages/bigpicture/BPLibrary'
import BPGameDetails from './pages/bigpicture/BPGameDetails'
import BPSettings from './pages/bigpicture/BPSettings'
import BPSystems from './pages/bigpicture/BPSystems'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

function App() {
  const { isFirstRun, checkFirstRun, isLoading } = useAppStore()
  const handlePlaySessionEnded = useLibraryStore(s => s.handlePlaySessionEnded)
  const setScrapeProgress = useLibraryStore(s => s.setScrapeProgress)
  const setDownloadProgress = useEmulatorStore(s => s.setDownloadProgress)
  const {
    isBigPictureMode,
    setBigPictureMode,
    keyboardShortcuts,
    loadSettings: loadInputSettings,
    bigPictureOnStartup
  } = useInputStore()

  useEffect(() => {
    checkFirstRun()
    loadInputSettings()
  }, [checkFirstRun, loadInputSettings])

  useEffect(() => {
    if (isFirstRun || isLoading) return
    const unsubscribe = window.electronAPI.emulators.onPlaySessionEnded(
      (gameId, durationMinutes) => handlePlaySessionEnded(gameId, durationMinutes)
    )
    return unsubscribe
  }, [isFirstRun, isLoading, handlePlaySessionEnded])

  useEffect(() => {
    if (isFirstRun || isLoading) return
    const unsubscribe = window.electronAPI.metadata.onScrapeProgress(
      (progress) => setScrapeProgress(progress)
    )
    return unsubscribe
  }, [isFirstRun, isLoading, setScrapeProgress])

  // Listen for core download progress
  useEffect(() => {
    if (isFirstRun || isLoading) return
    const unsubscribe = window.electronAPI.cores.onDownloadProgress(
      (progress) => setDownloadProgress(progress.coreId, progress)
    )
    return unsubscribe
  }, [isFirstRun, isLoading, setDownloadProgress])

  // Global keyboard shortcut handlers
  const shortcutHandlers = useMemo(() => ({
    toggleFullscreen: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        document.documentElement.requestFullscreen()
      }
    },
    focusSearch: () => {
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
        searchInput.select()
      }
    },
    openSettings: () => {
      if (isBigPictureMode) {
        window.location.hash = '#/bigpicture/settings'
      } else {
        window.location.hash = '#/settings'
      }
    },
    toggleBigPicture: () => {
      setBigPictureMode(!isBigPictureMode)
      if (!isBigPictureMode) {
        window.location.hash = '#/bigpicture'
      } else {
        window.location.hash = '#/'
      }
    },
    back: () => {
      window.history.back()
    }
  }), [isBigPictureMode, setBigPictureMode])

  // Reverse mapping: action -> shortcut
  const shortcutsMap = useMemo(() => {
    const map: Record<string, string> = {}
    Object.entries(keyboardShortcuts).forEach(([action, shortcut]) => {
      map[action] = shortcut
    })
    return map
  }, [keyboardShortcuts])

  // Use global keyboard shortcuts (disabled during emulation)
  const location = typeof window !== 'undefined' ? window.location.hash : ''
  const isInEmulator = location.includes('/play/')
  useKeyboardShortcuts(shortcutsMap, shortcutHandlers, !isFirstRun && !isLoading && !isInEmulator)

  // Handle Big Picture mode on startup
  useEffect(() => {
    if (!isFirstRun && !isLoading && bigPictureOnStartup && !window.location.hash.includes('/bigpicture')) {
      setBigPictureMode(true)
      window.location.hash = '#/bigpicture'
    }
  }, [isFirstRun, isLoading, bigPictureOnStartup, setBigPictureMode])

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full spinner mx-auto mb-4" />
          <p className="text-surface-400">Loading EasyEmu...</p>
        </div>
      </div>
    )
  }

  if (isFirstRun) {
    return (
      <>
        <SetupWizard />
        <ToastContainer />
      </>
    )
  }

  return (
    <GamepadProvider>
      <Routes>
        {/* Full-screen emulator view (no layout) */}
        <Route path="/play/:gameId" element={<EmulatorView />} />

        {/* Big Picture mode routes */}
        <Route path="/bigpicture" element={<BPLayout />}>
          <Route index element={<BPLibrary />} />
          <Route path="game/:gameId" element={<BPGameDetails />} />
          <Route path="systems" element={<BPSystems />} />
          <Route path="settings" element={<BPSettings />} />
        </Route>

        {/* Standard layout routes */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Library />} />
              <Route path="/game/:id" element={<GameDetails />} />
              <Route path="/systems" element={<SystemBrowser />} />
              <Route path="/systems/:platform" element={<SystemBrowser />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/:section" element={<Settings />} />
            </Routes>
          </Layout>
        } />
      </Routes>
      <ToastContainer />
    </GamepadProvider>
  )
}

export default App
