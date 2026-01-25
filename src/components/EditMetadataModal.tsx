import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { X, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Game } from '../types'
import { useUIStore } from '../store/uiStore'
import { useLibraryStore } from '../store/libraryStore'
import { pathToLocalImageUrl } from '../utils/image'
import { PLATFORMS } from '../constants/platforms'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'
import OnScreenKeyboard from './OnScreenKeyboard'

interface EditMetadataModalProps {
  game: Game
  isOpen: boolean
  onClose: () => void
}

export default function EditMetadataModal({ game, isOpen, onClose }: EditMetadataModalProps) {
  const [title, setTitle] = useState(game.title)
  const [platform, setPlatform] = useState(game.platform)
  const [description, setDescription] = useState(game.description || '')
  const [developer, setDeveloper] = useState(game.developer || '')
  const [publisher, setPublisher] = useState(game.publisher || '')
  const [releaseDate, setReleaseDate] = useState(game.releaseDate ? game.releaseDate.split('T')[0] : '')
  const [genres, setGenres] = useState(game.genres?.join(', ') || '')
  const [rating, setRating] = useState(game.rating?.toString() || '')
  const [coverPath, setCoverPath] = useState(game.coverPath || '')
  const [backdropPath, setBackdropPath] = useState(game.backdropPath || '')
  const [saving, setSaving] = useState(false)
  const [focusedField, setFocusedField] = useState(0)
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false)
  const [platformDropdownIndex, setPlatformDropdownIndex] = useState(0)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [keyboardField, setKeyboardField] = useState<string | null>(null)
  const { addToast } = useUIStore()
  const { loadLibrary } = useLibraryStore()
  
  // Prevent A button from firing immediately after modal opens
  const justOpenedRef = useRef(true)
  
  // Ref for scrollable container (right stick scrolling)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Platform dropdown options - memoized to prevent effect re-runs
  const platformOptions = useMemo(() => [
    { value: 'unknown', label: 'Unknown (fix if detection failed)' },
    ...PLATFORMS.map(p => ({ value: p.id, label: `${p.shortName} – ${p.name}` }))
  ], [])

  useEffect(() => {
    if (isOpen) {
      setTitle(game.title)
      setPlatform(game.platform)
      setDescription(game.description || '')
      setDeveloper(game.developer || '')
      setPublisher(game.publisher || '')
      setReleaseDate(game.releaseDate ? game.releaseDate.split('T')[0] : '')
      setGenres(game.genres?.join(', ') || '')
      setRating(game.rating?.toString() || '')
      setCoverPath(game.coverPath || '')
      setBackdropPath(game.backdropPath || '')
      setFocusedField(0)
      setPlatformDropdownOpen(false)
      setKeyboardOpen(false)
      setKeyboardField(null)
      justOpenedRef.current = true
      
      // Clear navigation guard after short delay
      const timeout = setTimeout(() => {
        justOpenedRef.current = false
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [game, isOpen])
  
  // Sync platform dropdown index when it opens
  useEffect(() => {
    if (platformDropdownOpen) {
      const currentIndex = platformOptions.findIndex(opt => opt.value === platform)
      setPlatformDropdownIndex(currentIndex >= 0 ? currentIndex : 0)
    }
  }, [platformDropdownOpen, platform, platformOptions])
  
  // Auto-scroll to focused field when navigating (with lookahead)
  useEffect(() => {
    if (!isOpen || keyboardOpen) return
    
    const container = scrollContainerRef.current
    if (!container) return
    
    // Find the field element by data attribute
    const fieldElement = container.querySelector(`[data-field-index="${focusedField}"]`) as HTMLElement
    if (fieldElement) {
      // Get field position relative to container
      const containerRect = container.getBoundingClientRect()
      const fieldRect = fieldElement.getBoundingClientRect()
      const relativeTop = fieldRect.top - containerRect.top + container.scrollTop
      
      // Scroll with offset to show upcoming content (field positioned ~30% from top)
      const targetScroll = relativeTop - containerRect.height * 0.3
      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
    }
  }, [focusedField, isOpen, keyboardOpen])
  
  // Field navigation order
  const fields = [
    'title', 'platform', 'description', 'developer', 'publisher',
    'releaseDate', 'rating', 'genres', 'coverPath', 'coverBrowse',
    'backdropPath', 'backdropBrowse', 'cancel', 'save'
  ] as const
  
  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    // Handle platform dropdown navigation
    if (platformDropdownOpen) {
      if (direction === 'up') {
        setPlatformDropdownIndex(prev => Math.max(0, prev - 1))
      } else if (direction === 'down') {
        setPlatformDropdownIndex(prev => Math.min(platformOptions.length - 1, prev + 1))
      }
      return
    }
    
    // Handle rating adjustment with left/right
    const field = fields[focusedField]
    if (field === 'rating' && (direction === 'left' || direction === 'right')) {
      const current = parseFloat(rating) || 0
      const step = 0.5
      if (direction === 'left') {
        setRating(Math.max(0, current - step).toString())
      } else {
        setRating(Math.min(10, current + step).toString())
      }
      return
    }
    
    // Normal field navigation
    if (direction === 'up') {
      setFocusedField(prev => Math.max(0, prev - 1))
    } else if (direction === 'down') {
      setFocusedField(prev => Math.min(fields.length - 1, prev + 1))
    } else if (direction === 'left') {
      // Left navigation for paired fields
      if (field === 'coverBrowse') setFocusedField(fields.indexOf('coverPath'))
      else if (field === 'backdropBrowse') setFocusedField(fields.indexOf('backdropPath'))
      else if (field === 'save') setFocusedField(fields.indexOf('cancel'))
    } else if (direction === 'right') {
      // Right navigation for paired fields
      if (field === 'coverPath') setFocusedField(fields.indexOf('coverBrowse'))
      else if (field === 'backdropPath') setFocusedField(fields.indexOf('backdropBrowse'))
      else if (field === 'cancel') setFocusedField(fields.indexOf('save'))
    }
  }, [platformDropdownOpen, platformOptions.length, focusedField, fields, rating])
  
  const handleConfirm = useCallback(() => {
    if (justOpenedRef.current) return
    
    // Handle platform dropdown selection
    if (platformDropdownOpen) {
      const selected = platformOptions[platformDropdownIndex]
      if (selected) {
        setPlatform(selected.value)
        setPlatformDropdownOpen(false)
      }
      return
    }
    
    const field = fields[focusedField]
    
    // Text fields that open on-screen keyboard
    const textFields = ['title', 'description', 'developer', 'publisher', 'releaseDate', 'genres', 'coverPath', 'backdropPath']
    if (textFields.includes(field)) {
      setKeyboardField(field)
      setKeyboardOpen(true)
      return
    }
    
    switch (field) {
      case 'platform':
        setPlatformDropdownOpen(true)
        break
      case 'rating':
        // Rating uses left/right, A does nothing special
        break
      case 'coverBrowse':
        handleBrowseCover()
        break
      case 'backdropBrowse':
        handleBrowseBackdrop()
        break
      case 'cancel':
        onClose()
        break
      case 'save':
        handleSave()
        break
    }
  }, [platformDropdownOpen, platformDropdownIndex, platformOptions, focusedField, fields, onClose])
  
  const handleBack = useCallback(() => {
    if (platformDropdownOpen) {
      setPlatformDropdownOpen(false)
      return
    }
    onClose()
  }, [platformDropdownOpen, onClose])
  
  // Handle keyboard submit
  const handleKeyboardSubmit = useCallback((value: string) => {
    switch (keyboardField) {
      case 'title':
        setTitle(value)
        break
      case 'description':
        setDescription(value)
        break
      case 'developer':
        setDeveloper(value)
        break
      case 'publisher':
        setPublisher(value)
        break
      case 'releaseDate':
        setReleaseDate(value)
        break
      case 'genres':
        setGenres(value)
        break
      case 'coverPath':
        setCoverPath(value)
        break
      case 'backdropPath':
        setBackdropPath(value)
        break
    }
    setKeyboardOpen(false)
    setKeyboardField(null)
  }, [keyboardField])
  
  // Get current keyboard value based on field
  const getKeyboardValue = () => {
    switch (keyboardField) {
      case 'title': return title
      case 'description': return description
      case 'developer': return developer
      case 'publisher': return publisher
      case 'releaseDate': return releaseDate
      case 'genres': return genres
      case 'coverPath': return coverPath
      case 'backdropPath': return backdropPath
      default: return ''
    }
  }
  
  // Get keyboard title based on field
  const getKeyboardTitle = () => {
    switch (keyboardField) {
      case 'title': return 'Edit Title'
      case 'description': return 'Edit Description'
      case 'developer': return 'Edit Developer'
      case 'publisher': return 'Edit Publisher'
      case 'releaseDate': return 'Edit Release Date (YYYY-MM-DD)'
      case 'genres': return 'Edit Genres (comma-separated)'
      case 'coverPath': return 'Edit Cover Path'
      case 'backdropPath': return 'Edit Backdrop Path'
      default: return 'Enter Text'
    }
  }
  
  // Gamepad navigation (disabled when keyboard is open)
  useGamepadNavigation({
    enabled: isOpen && !keyboardOpen,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack,
    scrollRef: scrollContainerRef
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const genresArray = genres
        .split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0)

      const metadata: Record<string, unknown> = {
        title: title.trim() || game.title,
        platform: platform.trim() || game.platform,
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
      <div 
        ref={scrollContainerRef}
        className="bg-surface-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto"
      >
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
          <div data-field-index={fields.indexOf('title')}>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full bg-surface-800 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${
                focusedField === fields.indexOf('title') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
              }`}
              required
              readOnly
            />
          </div>

          <div data-field-index={fields.indexOf('platform')}>
            <label className="block text-sm font-medium mb-2">Platform</label>
            <div className="relative">
              {/* Custom dropdown trigger */}
              <button
                type="button"
                onClick={() => setPlatformDropdownOpen(!platformDropdownOpen)}
                className={`w-full bg-surface-800 border rounded px-3 py-2 text-left flex items-center justify-between transition-all ${
                  focusedField === fields.indexOf('platform') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
                }`}
              >
                <span>{platformOptions.find(opt => opt.value === platform)?.label || 'Unknown'}</span>
                <ChevronDown size={18} className={`transition-transform ${platformDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown menu */}
              {platformDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-10 max-h-48 overflow-auto">
                  {platformOptions.map((option, index) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPlatform(option.value)
                        setPlatformDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between transition-all ${
                        platformDropdownIndex === index ? 'bg-accent text-white' : 'hover:bg-surface-700'
                      } ${index === 0 ? 'rounded-t-lg' : ''} ${index === platformOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                    >
                      <span className="truncate">{option.label}</span>
                      {platform === option.value && <Check size={16} className="flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-surface-500 mt-1">
              Used for launching. Set to PS3, SNES, etc. when auto-detect misses it (e.g. plain .iso in a generic folder).
            </p>
          </div>

          <div data-field-index={fields.indexOf('description')}>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              className={`w-full bg-surface-800 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent resize-none ${
                focusedField === fields.indexOf('description') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
              }`}
              readOnly
            />
          </div>

          <div data-field-index={fields.indexOf('developer')}>
            <label className="block text-sm font-medium mb-2">Developer</label>
            <input
              type="text"
              value={developer}
              onChange={e => setDeveloper(e.target.value)}
              className={`w-full bg-surface-800 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${
                focusedField === fields.indexOf('developer') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
              }`}
              readOnly
            />
          </div>

          <div data-field-index={fields.indexOf('publisher')}>
            <label className="block text-sm font-medium mb-2">Publisher</label>
            <input
              type="text"
              value={publisher}
              onChange={e => setPublisher(e.target.value)}
              className={`w-full bg-surface-800 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${
                focusedField === fields.indexOf('publisher') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
              }`}
              readOnly
            />
          </div>

          <div data-field-index={fields.indexOf('releaseDate')}>
            <label className="block text-sm font-medium mb-2">Release Date</label>
            <input
              type="text"
              value={releaseDate}
              onChange={e => setReleaseDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              className={`w-full bg-surface-800 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${
                focusedField === fields.indexOf('releaseDate') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
              }`}
              readOnly
            />
          </div>

          <div data-field-index={fields.indexOf('rating')}>
            <label className="block text-sm font-medium mb-2">Rating (0-10)</label>
            <div className={`flex items-center gap-2 bg-surface-800 border rounded px-3 py-2 transition-all ${
              focusedField === fields.indexOf('rating') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
            }`}>
              {focusedField === fields.indexOf('rating') && (
                <ChevronLeft size={18} className="text-accent flex-shrink-0" />
              )}
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={rating}
                onChange={e => setRating(e.target.value)}
                className="flex-1 bg-transparent focus:outline-none text-center"
                placeholder="0"
              />
              {focusedField === fields.indexOf('rating') && (
                <ChevronRight size={18} className="text-accent flex-shrink-0" />
              )}
            </div>
            {focusedField === fields.indexOf('rating') && (
              <p className="text-xs text-surface-400 mt-1">Use ←/→ to adjust</p>
            )}
          </div>

          <div data-field-index={fields.indexOf('genres')}>
            <label className="block text-sm font-medium mb-2">Genres (comma-separated)</label>
            <input
              type="text"
              value={genres}
              onChange={e => setGenres(e.target.value)}
              placeholder="Action, Adventure, RPG"
              className={`w-full bg-surface-800 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${
                focusedField === fields.indexOf('genres') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
              }`}
              readOnly
            />
          </div>

          {/* Cover Image */}
          <div data-field-index={fields.indexOf('coverPath')}>
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
                  className={`flex-1 bg-surface-800 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${
                    focusedField === fields.indexOf('coverPath') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
                  }`}
                  readOnly
                />
                <button
                  data-field-index={fields.indexOf('coverBrowse')}
                  onClick={handleBrowseCover}
                  className={`px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg transition-all ${
                    focusedField === fields.indexOf('coverBrowse') ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  Browse
                </button>
              </div>
            </div>
          </div>

          {/* Backdrop/Hero Image */}
          <div data-field-index={fields.indexOf('backdropPath')}>
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
                  className={`flex-1 bg-surface-800 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent ${
                    focusedField === fields.indexOf('backdropPath') ? 'border-accent ring-2 ring-accent' : 'border-surface-700'
                  }`}
                  readOnly
                />
                <button
                  data-field-index={fields.indexOf('backdropBrowse')}
                  onClick={handleBrowseBackdrop}
                  className={`px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg transition-all ${
                    focusedField === fields.indexOf('backdropBrowse') ? 'ring-2 ring-accent' : ''
                  }`}
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
            data-field-index={fields.indexOf('cancel')}
            onClick={onClose}
            className={`px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg transition-all ${
              focusedField === fields.indexOf('cancel') ? 'ring-2 ring-accent' : ''
            }`}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            data-field-index={fields.indexOf('save')}
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className={`px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg disabled:opacity-50 transition-all ${
              focusedField === fields.indexOf('save') ? 'ring-2 ring-white' : ''
            }`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      
      {/* On-screen keyboard */}
      <OnScreenKeyboard
        isOpen={keyboardOpen}
        initialValue={getKeyboardValue()}
        onClose={() => {
          setKeyboardOpen(false)
          setKeyboardField(null)
        }}
        onSubmit={handleKeyboardSubmit}
        title={getKeyboardTitle()}
        multiline={keyboardField === 'description'}
      />
    </div>
  )
}
