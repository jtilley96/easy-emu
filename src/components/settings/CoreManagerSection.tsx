import { useState, useEffect, useCallback } from 'react'
import { Download, Trash2, Check, AlertCircle, Loader2, HardDrive } from 'lucide-react'
import { useEmulatorStore } from '../../store/emulatorStore'
import { useUIStore } from '../../store/uiStore'
import { AvailableCore, CoreDownloadProgress, SettingsSectionProps } from '../../types'
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation'

export default function CoreManagerSection({ isFocused, focusedRow, focusedCol: _focusedCol, onFocusChange, onGridChange, onBack, justActivatedRef, scrollRef }: SettingsSectionProps) {
  const {
    availableCores,
    downloadingCores,
    loadCores,
    downloadCore,
    deleteCore,
    setDownloadProgress,
    preferEmbedded,
    setPreferEmbedded
  } = useEmulatorStore()
  const { addToast } = useUIStore()

  const [loading, setLoading] = useState(true)
  const [deletingCore, setDeletingCore] = useState<string | null>(null)

  // Simple linear navigation: preferEmbedded toggle, then each core
  const notInstalledCount = availableCores.filter(c => !c.installed).length
  const hasInstallAll = notInstalledCount > 0
  const itemCount = 1 + (hasInstallAll ? 1 : 0) + availableCores.length
  
  useEffect(() => {
    onGridChange({ rows: itemCount, cols: Array(itemCount).fill(1) })
  }, [itemCount, onGridChange])

  // Helper to check if row is focused
  const isRowFocused = (row: number) => {
    return isFocused && focusedRow === row
  }
  
  // Map row index to item
  const getRowItem = (row: number): 'preferEmbedded' | 'installAll' | { type: 'core', index: number } | null => {
    if (row === 0) return 'preferEmbedded'
    if (hasInstallAll && row === 1) return 'installAll'
    const coreIndex = row - (hasInstallAll ? 2 : 1)
    if (coreIndex >= 0 && coreIndex < availableCores.length) {
      return { type: 'core', index: coreIndex }
    }
    return null
  }

  // Load cores on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await loadCores()
      setLoading(false)
    }
    load()
  }, [loadCores])

  // Listen for download progress events
  useEffect(() => {
    const unsubscribe = window.electronAPI.cores.onDownloadProgress((progress: CoreDownloadProgress) => {
      setDownloadProgress(progress.coreId, progress)
      if (progress.status === 'complete') {
        addToast('success', `${progress.coreId} core installed successfully`)
        loadCores()
      } else if (progress.status === 'error') {
        addToast('error', `Failed to install core: ${progress.error}`)
      }
    })
    return unsubscribe
  }, [setDownloadProgress, addToast, loadCores])

  const handleDownload = async (coreId: string) => {
    try {
      await downloadCore(coreId)
    } catch (error) {
      addToast('error', `Failed to download: ${(error as Error).message}`)
    }
  }

  const handleDelete = async (coreId: string) => {
    setDeletingCore(coreId)
    try {
      await deleteCore(coreId)
      addToast('success', 'Core removed')
    } catch (error) {
      addToast('error', 'Failed to remove core')
    } finally {
      setDeletingCore(null)
    }
  }

  const handleInstallAll = async () => {
    const notInstalled = availableCores.filter(c => !c.installed)
    for (const core of notInstalled) {
      try {
        await downloadCore(core.id)
      } catch {
        // Continue with next core
      }
    }
  }

  const installedCount = availableCores.filter(c => c.installed).length
  const totalCount = availableCores.length

  // Handle gamepad confirmation
  const handleConfirm = useCallback(() => {
    // Ignore if we just activated (prevents double-activation from held A button)
    if (justActivatedRef.current) return
    
    const item = getRowItem(focusedRow)
    if (!item) return

    if (item === 'preferEmbedded') {
      setPreferEmbedded(!preferEmbedded)
    } else if (item === 'installAll') {
      handleInstallAll()
    } else if (typeof item === 'object' && item.type === 'core') {
      const core = availableCores[item.index]
      if (core) {
        if (core.installed) {
          handleDelete(core.id)
        } else {
          handleDownload(core.id)
        }
      }
    }
  }, [focusedRow, preferEmbedded, availableCores, hasInstallAll, justActivatedRef])

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Embedded Emulator Cores</h2>
        <p className="text-surface-400">
          Download LibRetro cores to play games directly in EasyEmu without external emulators.
        </p>
      </div>

      {/* Settings toggle */}
      <div 
        data-focus-row={0}
        data-focus-col={0}
        className={`p-4 bg-surface-800 rounded-lg transition-all ${
          isRowFocused(0) ? 'ring-2 ring-accent' : ''
        }`}>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="font-medium">Prefer Embedded Emulation</div>
            <div className="text-sm text-surface-400">
              Use built-in emulator when available instead of external emulators
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={preferEmbedded}
              onChange={(e) => setPreferEmbedded(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </div>
        </label>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between p-4 bg-surface-800 rounded-lg">
        <div className="flex items-center gap-3">
          <HardDrive className="text-accent" size={24} />
          <div>
            <div className="font-medium">{installedCount} of {totalCount} cores installed</div>
            <div className="text-sm text-surface-400">
              {installedCount === totalCount ? 'All cores ready' : 'Some platforms unavailable'}
            </div>
          </div>
        </div>

        {installedCount < totalCount && (
          <button
            data-focus-row={1}
            data-focus-col={0}
            onClick={handleInstallAll}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isRowFocused(1)
                ? 'bg-accent text-white ring-2 ring-accent scale-105'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            Install All
          </button>
        )}
      </div>

      {/* Core list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-3">
          {availableCores.map((core, index) => {
            const rowIndex = (hasInstallAll ? 2 : 1) + index
            return (
              <CoreCard
                key={core.id}
                core={core}
                downloadProgress={downloadingCores[core.id]}
                isDeleting={deletingCore === core.id}
                isFocused={isRowFocused(rowIndex)}
                rowIndex={rowIndex}
                onDownload={() => handleDownload(core.id)}
                onDelete={() => handleDelete(core.id)}
              />
            )
          })}
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-surface-800/50 rounded-lg">
        <div className="flex gap-3">
          <AlertCircle className="text-surface-400 flex-shrink-0" size={20} />
          <div className="text-sm text-surface-400">
            <p className="mb-2">
              Embedded cores use EmulatorJS WebAssembly technology. They may have slightly lower
              performance than native emulators but offer convenience and cross-platform compatibility.
            </p>
            <p>
              For best performance on demanding systems (N64, PS1), consider using a native emulator
              like RetroArch or DuckStation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CoreCardProps {
  core: AvailableCore
  downloadProgress?: CoreDownloadProgress
  isDeleting: boolean
  isFocused: boolean
  rowIndex: number
  onDownload: () => void
  onDelete: () => void
}

function CoreCard({ core, downloadProgress, isDeleting, isFocused, rowIndex, onDownload, onDelete }: CoreCardProps) {
  const isDownloading = downloadProgress && downloadProgress.status === 'downloading'
  const isVerifying = downloadProgress?.status === 'verifying'
  const hasError = downloadProgress?.status === 'error'

  const formatSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <div 
      data-focus-row={rowIndex}
      data-focus-col={0}
      className={`p-4 bg-surface-800 rounded-lg transition-all ${
        isFocused ? 'ring-2 ring-accent' : ''
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Status icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            core.installed ? 'bg-green-500/20 text-green-400' : 'bg-surface-700 text-surface-400'
          }`}>
            {core.installed ? (
              <Check size={20} />
            ) : isDownloading || isVerifying ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
          </div>

          {/* Info */}
          <div>
            <div className="font-medium">{core.name}</div>
            <div className="text-sm text-surface-400">
              {core.platforms.join(', ')} &bull; ~{formatSize(core.size)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {core.installed ? (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                isFocused
                  ? 'bg-red-500/30 text-red-400'
                  : 'hover:bg-red-500/20 hover:text-red-400'
              }`}
              title="Remove core"
            >
              {isDeleting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Trash2 size={18} />
              )}
            </button>
          ) : (
            <button
              onClick={onDownload}
              disabled={isDownloading || isVerifying}
              className={`px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-all ${
                isFocused
                  ? 'bg-accent text-white scale-105'
                  : 'bg-accent hover:bg-accent-hover'
              }`}
            >
              {isDownloading ? 'Downloading...' : isVerifying ? 'Verifying...' : 'Install'}
            </button>
          )}
        </div>
      </div>

      {/* Download progress */}
      {(isDownloading || isVerifying) && (
        <div className="mt-3">
          <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${downloadProgress?.progress || 0}%` }}
            />
          </div>
          <div className="text-xs text-surface-400 mt-1">
            {isVerifying ? 'Verifying files...' : `${downloadProgress?.progress || 0}%`}
          </div>
        </div>
      )}

      {/* Error message */}
      {hasError && (
        <div className="mt-3 text-sm text-red-400">
          Error: {downloadProgress?.error}
        </div>
      )}
    </div>
  )
}
