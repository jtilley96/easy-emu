import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import { useLibraryStore } from './store/libraryStore'
import Layout from './components/Layout'
import Library from './pages/Library'
import GameDetails from './pages/GameDetails'
import Settings from './pages/Settings'
import SystemBrowser from './pages/SystemBrowser'
import SetupWizard from './pages/SetupWizard'
import ToastContainer from './components/Toast'

function App() {
  const { isFirstRun, checkFirstRun, isLoading } = useAppStore()
  const handlePlaySessionEnded = useLibraryStore(s => s.handlePlaySessionEnded)
  const setScrapeProgress = useLibraryStore(s => s.setScrapeProgress)

  useEffect(() => {
    checkFirstRun()
  }, [checkFirstRun])

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
    <>
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
      <ToastContainer />
    </>
  )
}

export default App
