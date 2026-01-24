import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Game, EmulatorInfo } from '../types'
import { useUIStore } from '../store/uiStore'
import { useLibraryStore } from '../store/libraryStore'

interface GameSettingsModalProps {
  game: Game
  isOpen: boolean
  onClose: () => void
}

export default function GameSettingsModal({ game, isOpen, onClose }: GameSettingsModalProps) {
  const [preferredEmulator, setPreferredEmulator] = useState<string>(game.preferredEmulator ?? '')
  const [emulators, setEmulators] = useState<EmulatorInfo[]>([])
  const [saving, setSaving] = useState(false)
  const { addToast } = useUIStore()
  const updateGame = useLibraryStore(s => s.updateGame)

  useEffect(() => {
    if (isOpen) {
      setPreferredEmulator(game.preferredEmulator ?? '')
    }
  }, [game, isOpen])

  useEffect(() => {
    if (!isOpen) return
    window.electronAPI.emulators.detect().then(results => {
      setEmulators(
        (results as EmulatorInfo[]).filter(
          e => e.installed && e.enabled !== false && e.platforms.includes(game.platform)
        )
      )
    })
  }, [isOpen, game.platform])

  const handleSave = async () => {
    setSaving(true)
    try {
      const value = preferredEmulator.trim() || undefined
      await updateGame(game.id, { preferredEmulator: value })
      addToast('success', 'Game settings saved')
      onClose()
    } catch (error) {
      console.error('Failed to save game settings:', error)
      addToast('error', 'Failed to save game settings')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <h2 className="text-xl font-bold">Game Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-surface-400 text-sm">
            Override which emulator to use when launching <strong>{game.title}</strong>.
          </p>

          <div>
            <label className="block text-sm font-medium mb-2">Preferred emulator</label>
            <select
              value={preferredEmulator}
              onChange={e => setPreferredEmulator(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Default (use platform default)</option>
              {emulators.map(emu => (
                <option key={emu.id} value={emu.id}>{emu.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
