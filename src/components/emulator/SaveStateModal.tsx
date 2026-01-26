import { useState, useEffect, useCallback } from 'react'
import { X, Save, FolderOpen, Trash2, Loader2 } from 'lucide-react'
import { SaveStateInfo } from '../../types'
import { useEmulatorStore } from '../../store/emulatorStore'
import { useGamepadNavigation } from '../../hooks/useGamepadNavigation'
import { pathToLocalImageUrl } from '../../utils/image'
import { formatDate } from '../../utils/format'

interface SaveStateModalProps {
  isOpen: boolean
  onClose: () => void
  gameId: string
  mode: 'save' | 'load'
  onSave: (slot: number) => Promise<void>
  onLoad: (slot: number) => Promise<void>
}

export default function SaveStateModal({
  isOpen,
  onClose,
  gameId,
  mode,
  onSave,
  onLoad
}: SaveStateModalProps) {
  const [states, setStates] = useState<SaveStateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [actionSlot, setActionSlot] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  const { listStates, deleteState } = useEmulatorStore()

  const COLUMNS = 5
  const TOTAL_SLOTS = 10

  // Load states on open and reset focus
  useEffect(() => {
    if (isOpen) {
      loadStates()
      setFocusedIndex(0)
    }
  }, [isOpen, gameId])

  const loadStates = async () => {
    setLoading(true)
    try {
      const stateList = await listStates(gameId)
      setStates(stateList)
    } catch (error) {
      console.error('Failed to load states:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSlotClick = async (slot: number) => {
    const state = states.find(s => s.slot === slot)

    if (mode === 'save') {
      setActionSlot(slot)
      try {
        await onSave(slot)
        await loadStates()
      } catch (error) {
        console.error('Failed to save state:', error)
      } finally {
        setActionSlot(null)
      }
    } else if (mode === 'load' && state?.exists) {
      setActionSlot(slot)
      try {
        await onLoad(slot)
        onClose()
      } catch (error) {
        console.error('Failed to load state:', error)
      } finally {
        setActionSlot(null)
      }
    }
  }

  const handleDelete = async (slot: number) => {
    try {
      await deleteState(gameId, slot)
      setDeleteConfirm(null)
      await loadStates()
    } catch (error) {
      console.error('Failed to delete state:', error)
    }
  }

  // Gamepad navigation handlers
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    setFocusedIndex(prev => {
      const row = Math.floor(prev / COLUMNS)
      const col = prev % COLUMNS

      switch (direction) {
        case 'up':
          return row > 0 ? prev - COLUMNS : prev
        case 'down':
          return row < Math.floor((TOTAL_SLOTS - 1) / COLUMNS) ? Math.min(prev + COLUMNS, TOTAL_SLOTS - 1) : prev
        case 'left':
          return col > 0 ? prev - 1 : prev
        case 'right':
          return col < COLUMNS - 1 && prev < TOTAL_SLOTS - 1 ? prev + 1 : prev
        default:
          return prev
      }
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (!loading && actionSlot === null) {
      handleSlotClick(focusedIndex)
    }
  }, [focusedIndex, loading, actionSlot])

  // Gamepad navigation
  useGamepadNavigation({
    enabled: isOpen && !loading,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: onClose
  })

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || loading) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          handleNavigate('up')
          break
        case 'ArrowDown':
          e.preventDefault()
          handleNavigate('down')
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleNavigate('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNavigate('right')
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleConfirm()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, handleNavigate, handleConfirm, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div className="flex items-center gap-3">
            {mode === 'save' ? (
              <Save className="text-accent" size={24} />
            ) : (
              <FolderOpen className="text-accent" size={24} />
            )}
            <h2 className="text-xl font-semibold">
              {mode === 'save' ? 'Save State' : 'Load State'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 10 }, (_, i) => {
                const state = states.find(s => s.slot === i)
                const isActive = actionSlot === i
                const isDeleting = deleteConfirm === i

                return (
                  <div
                    key={i}
                    className="relative group"
                  >
                    <button
                      onClick={() => handleSlotClick(i)}
                      disabled={isActive || (mode === 'load' && !state?.exists)}
                      className={`
                        w-full aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all
                        ${state?.exists
                          ? 'border-surface-600 hover:border-accent'
                          : 'border-surface-700 border-dashed'}
                        ${mode === 'load' && !state?.exists
                          ? 'opacity-50 cursor-not-allowed'
                          : 'cursor-pointer'}
                        ${isActive ? 'border-accent ring-2 ring-accent/50' : ''}
                        ${focusedIndex === i && !isActive
                          ? 'border-accent scale-105 shadow-lg bp-focus'
                          : ''}
                      `}
                    >
                      {state?.exists && state.screenshotPath ? (
                        <img
                          src={pathToLocalImageUrl(state.screenshotPath)}
                          alt={`Slot ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-surface-800 flex items-center justify-center">
                          {state?.exists ? (
                            <div className="text-surface-400 text-sm">No preview</div>
                          ) : (
                            <div className="text-surface-500 text-sm">Empty</div>
                          )}
                        </div>
                      )}

                      {/* Loading overlay */}
                      {isActive && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                      )}
                    </button>

                    {/* Slot info */}
                    <div className="mt-2 text-center">
                      <div className="text-sm font-medium">Slot {i + 1}</div>
                      {state?.exists && state.timestamp && (
                        <div className="text-xs text-surface-400">
                          {formatDate(state.timestamp)}
                        </div>
                      )}
                    </div>

                    {/* Delete button (only for existing states) */}
                    {state?.exists && mode === 'save' && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isDeleting ? (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(i)
                              }}
                              className="p-1 rounded bg-red-500 hover:bg-red-600 text-white text-xs"
                            >
                              Yes
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirm(null)
                              }}
                              className="p-1 rounded bg-surface-600 hover:bg-surface-500 text-xs"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirm(i)
                            }}
                            className="p-1 rounded bg-surface-800/80 hover:bg-red-500/80 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-surface-700 bg-surface-800/50">
          <p className="text-sm text-surface-400 text-center">
            {mode === 'save'
              ? 'Select a slot to save your progress. Existing saves will be overwritten.'
              : 'Select a save slot to restore your progress.'}
            {' '}Use D-pad to navigate, A to select, B to go back.
          </p>
        </div>
      </div>
    </div>
  )
}
