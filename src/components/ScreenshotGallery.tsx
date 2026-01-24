import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { pathToLocalImageUrl } from '../utils/image'

interface ScreenshotGalleryProps {
  screenshots: string[]
}

export default function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!screenshots || screenshots.length === 0) {
    return null
  }

  const openLightbox = (index: number) => {
    setSelectedIndex(index)
  }

  const closeLightbox = () => {
    setSelectedIndex(null)
  }

  const nextImage = () => {
    if (selectedIndex !== null && selectedIndex < screenshots.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const prevImage = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Screenshots</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {screenshots.map((screenshot, index) => (
            <button
              key={index}
              onClick={() => openLightbox(index)}
              className="aspect-video bg-surface-800 rounded-lg overflow-hidden hover:opacity-80 transition-opacity group"
            >
              <img
                src={pathToLocalImageUrl(screenshot)}
                alt={`Screenshot ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 bg-surface-900/80 hover:bg-surface-800 rounded-lg"
          >
            <X size={24} />
          </button>

          {screenshots.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
                }}
                disabled={selectedIndex === 0}
                className="absolute left-4 p-2 bg-surface-900/80 hover:bg-surface-800 rounded-lg disabled:opacity-50"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
                disabled={selectedIndex === screenshots.length - 1}
                className="absolute right-4 p-2 bg-surface-900/80 hover:bg-surface-800 rounded-lg disabled:opacity-50"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div
            className="max-w-7xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={pathToLocalImageUrl(screenshots[selectedIndex])}
              alt={`Screenshot ${selectedIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain"
            />
            {screenshots.length > 1 && (
              <div className="text-center mt-4 text-surface-400 text-sm">
                {selectedIndex + 1} / {screenshots.length}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
