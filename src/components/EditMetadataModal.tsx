import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Game } from '../types'
import { useUIStore } from '../store/uiStore'
import { useLibraryStore } from '../store/libraryStore'
import { pathToLocalImageUrl } from '../utils/image'

interface EditMetadataModalProps {
  game: Game
  isOpen: boolean
  onClose: () => void
}

export default function EditMetadataModal({ game, isOpen, onClose }: EditMetadataModalProps) {
  const [title, setTitle] = useState(game.title)
  const [description, setDescription] = useState(game.description || '')
  const [developer, setDeveloper] = useState(game.developer || '')
  const [publisher, setPublisher] = useState(game.publisher || '')
  const [releaseDate, setReleaseDate] = useState(game.releaseDate ? game.releaseDate.split('T')[0] : '')
  const [genres, setGenres] = useState(game.genres?.join(', ') || '')
  const [rating, setRating] = useState(game.rating?.toString() || '')
  const [coverPath, setCoverPath] = useState(game.coverPath || '')
  const [backdropPath, setBackdropPath] = useState(game.backdropPath || '')
  const [saving, setSaving] = useState(false)
  const { addToast } = useUIStore()
  const { loadLibrary } = useLibraryStore()

  useEffect(() => {
    if (isOpen) {
      setTitle(game.title)
      setDescription(game.description || '')
      setDeveloper(game.developer || '')
      setPublisher(game.publisher || '')
      setReleaseDate(game.releaseDate ? game.releaseDate.split('T')[0] : '')
      setGenres(game.genres?.join(', ') || '')
      setRating(game.rating?.toString() || '')
      setCoverPath(game.coverPath || '')
      setBackdropPath(game.backdropPath || '')
    }
  }, [game, isOpen])

  const handleSave = async () => {
    setSaving(true)
    try {
      const genresArray = genres
        .split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0)

      const metadata: Record<string, unknown> = {
        title: title.trim() || game.title,
        description: description.trim() || undefined,
        developer: developer.trim() || undefined,
        publisher: publisher.trim() || undefined,
        releaseDate: releaseDate || undefined,
        genres: genresArray.length > 0 ? genresArray : undefined,
        rating: rating ? parseFloat(rating) : undefined,
        // Always send cover/backdrop so clearing them actually removes paths (empty string = clear)
        coverPath: coverPath.trim() || '',
        backdropPath: backdropPath.trim() || ''
      }

      // Remove undefined values (but keep coverPath/backdropPath—we use '' to mean "clear")
      Object.keys(metadata).forEach(key => {
        if (metadata[key] === undefined) {
          delete metadata[key]
        }
      })

      await window.electronAPI.metadata.update(game.id, metadata)
      await loadLibrary()
      addToast('success', 'Metadata updated successfully')
      onClose()
    } catch (error) {
      console.error('Failed to update metadata:', error)
      addToast('error', 'Failed to update metadata')
    } finally {
      setSaving(false)
    }
  }

  const handleBrowseCover = async () => {
    try {
      const filePath = await window.electronAPI.dialog.openFile([
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
      ])
      if (filePath) {
        setCoverPath(filePath)
      }
    } catch (error) {
      console.error('Failed to browse for cover:', error)
    }
  }

  const handleBrowseBackdrop = async () => {
    try {
      const filePath = await window.electronAPI.dialog.openFile([
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }
      ])
      if (filePath) {
        setBackdropPath(filePath)
      }
    } catch (error) {
      console.error('Failed to browse for backdrop:', error)
    }
  }

  const handleClearCover = () => {
    setCoverPath('')
  }

  const handleClearBackdrop = () => {
    setBackdropPath('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <h2 className="text-2xl font-bold">Edit Metadata</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Developer</label>
              <input
                type="text"
                value={developer}
                onChange={e => setDeveloper(e.target.value)}
                className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Publisher</label>
              <input
                type="text"
                value={publisher}
                onChange={e => setPublisher(e.target.value)}
                className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Release Date</label>
              <input
                type="date"
                value={releaseDate}
                onChange={e => setReleaseDate(e.target.value)}
                className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rating (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={rating}
                onChange={e => setRating(e.target.value)}
                className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Genres (comma-separated)</label>
            <input
              type="text"
              value={genres}
              onChange={e => setGenres(e.target.value)}
              placeholder="Action, Adventure, RPG"
              className="w-full bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium mb-2">Cover Image</label>
            <div className="space-y-2">
              {coverPath && (
                <div className="relative w-32 h-40 bg-surface-800 rounded-lg overflow-hidden">
                  <img
                    src={pathToLocalImageUrl(coverPath)}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleClearCover}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded text-white text-xs"
                    title="Clear cover"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coverPath}
                  onChange={e => setCoverPath(e.target.value)}
                  placeholder="Path to cover image"
                  className="flex-1 bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  onClick={handleBrowseCover}
                  className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg"
                >
                  Browse
                </button>
              </div>
            </div>
          </div>

          {/* Backdrop/Hero Image */}
          <div>
            <label className="block text-sm font-medium mb-2">Backdrop/Hero Image</label>
            <div className="space-y-2">
              {backdropPath && (
                <div className="relative w-full h-32 bg-surface-800 rounded-lg overflow-hidden">
                  <img
                    src={pathToLocalImageUrl(backdropPath)}
                    alt="Backdrop preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleClearBackdrop}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded text-white text-xs"
                    title="Clear backdrop"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backdropPath}
                  onChange={e => setBackdropPath(e.target.value)}
                  placeholder="Path to backdrop/hero image"
                  className="flex-1 bg-surface-800 border border-surface-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  onClick={handleBrowseBackdrop}
                  className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg"
                >
                  Browse
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
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
            disabled={saving || !title.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
