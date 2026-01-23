import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [platform, setPlatform] = useState<string>('win32')

  useEffect(() => {
    // Get platform
    window.electronAPI.app.getPlatform().then(setPlatform)

    // Check initial maximized state
    window.electronAPI.window.isMaximized().then(setIsMaximized)

    // Listen for maximize changes
    window.electronAPI.window.onMaximizeChange(setIsMaximized)
  }, [])

  // macOS uses native title bar
  if (platform === 'darwin') {
    return (
      <div className="h-8 bg-surface-950 drag-region flex items-center justify-center">
        <span className="text-sm text-surface-400 font-medium">EasyEmu</span>
      </div>
    )
  }

  return (
    <div className="h-9 bg-surface-950 flex items-center justify-between select-none">
      {/* App title - draggable */}
      <div className="flex-1 h-full drag-region flex items-center px-4">
        <span className="text-sm text-surface-400 font-medium">EasyEmu</span>
      </div>

      {/* Window controls */}
      <div className="flex h-full no-drag">
        <button
          onClick={() => window.electronAPI.window.minimize()}
          className="w-12 h-full flex items-center justify-center hover:bg-surface-800 transition-colors"
          title="Minimize"
        >
          <Minus size={16} />
        </button>

        <button
          onClick={() => window.electronAPI.window.maximize()}
          className="w-12 h-full flex items-center justify-center hover:bg-surface-800 transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Maximize2 size={14} /> : <Square size={14} />}
        </button>

        <button
          onClick={() => window.electronAPI.window.close()}
          className="w-12 h-full flex items-center justify-center hover:bg-red-600 transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
