import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Delete, ArrowBigUp, Check } from 'lucide-react'
import { useGamepadNavigation } from '../hooks/useGamepadNavigation'

interface OnScreenKeyboardProps {
  isOpen: boolean
  initialValue: string
  onClose: () => void
  onSubmit: (value: string) => void
  title?: string
  multiline?: boolean
}

// Keyboard layouts
const LAYOUTS = {
  lower: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', "'"],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
    ['SYMBOLS', 'SPACE', 'BACKSPACE', 'DONE']
  ],
  upper: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '"'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '!', '?'],
    ['SYMBOLS', 'SPACE', 'BACKSPACE', 'DONE']
  ],
  symbols: [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['-', '_', '=', '+', '[', ']', '{', '}', '|', '\\'],
    [':', ';', '"', "'", '<', '>', ',', '.', '/', '?'],
    ['ABC', '~', '`', '€', '£', '¥', '©', '®', '™', '…'],
    ['SYMBOLS', 'SPACE', 'BACKSPACE', 'DONE']
  ]
}

type LayoutType = 'lower' | 'upper' | 'symbols'

export default function OnScreenKeyboard({
  isOpen,
  initialValue,
  onClose,
  onSubmit,
  title = 'Enter Text',
  multiline = false
}: OnScreenKeyboardProps) {
  const [value, setValue] = useState(initialValue)
  const [layout, setLayout] = useState<LayoutType>('lower')
  const [focusRow, setFocusRow] = useState(0)
  const [focusCol, setFocusCol] = useState(0)
  const justOpenedRef = useRef(true)

  const currentLayout = LAYOUTS[layout]

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue)
      setLayout('lower')
      setFocusRow(1) // Start on 'q' row
      setFocusCol(0)
      justOpenedRef.current = true
      
      const timeout = setTimeout(() => {
        justOpenedRef.current = false
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [isOpen, initialValue])

  const getKey = useCallback((row: number, col: number): string | null => {
    const rowKeys = currentLayout[row]
    if (!rowKeys) return null
    return rowKeys[col] ?? null
  }, [currentLayout])

  const handleNavigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const rowKeys = currentLayout[focusRow]
    
    if (direction === 'up') {
      setFocusRow(prev => Math.max(0, prev - 1))
      // Clamp column to new row length
      const newRowKeys = currentLayout[Math.max(0, focusRow - 1)]
      if (newRowKeys && focusCol >= newRowKeys.length) {
        setFocusCol(newRowKeys.length - 1)
      }
    } else if (direction === 'down') {
      setFocusRow(prev => Math.min(currentLayout.length - 1, prev + 1))
      // Clamp column to new row length
      const newRowKeys = currentLayout[Math.min(currentLayout.length - 1, focusRow + 1)]
      if (newRowKeys && focusCol >= newRowKeys.length) {
        setFocusCol(newRowKeys.length - 1)
      }
    } else if (direction === 'left') {
      setFocusCol(prev => Math.max(0, prev - 1))
    } else if (direction === 'right') {
      setFocusCol(prev => Math.min(rowKeys.length - 1, prev + 1))
    }
  }, [focusRow, focusCol, currentLayout])

  const handleKeyPress = useCallback((key: string) => {
    switch (key) {
      case 'SHIFT':
        setLayout(prev => prev === 'upper' ? 'lower' : 'upper')
        break
      case 'SYMBOLS':
        setLayout(prev => prev === 'symbols' ? 'lower' : 'symbols')
        break
      case 'ABC':
        setLayout('lower')
        break
      case 'SPACE':
        setValue(prev => prev + ' ')
        break
      case 'BACKSPACE':
        setValue(prev => prev.slice(0, -1))
        break
      case 'DONE':
        onSubmit(value)
        break
      default:
        setValue(prev => prev + key)
        // Auto-lowercase after typing a letter in uppercase mode
        if (layout === 'upper' && /^[A-Z]$/.test(key)) {
          setLayout('lower')
        }
        break
    }
  }, [value, layout, onSubmit])

  const handleConfirm = useCallback(() => {
    if (justOpenedRef.current) return
    
    const key = getKey(focusRow, focusCol)
    if (key) {
      handleKeyPress(key)
    }
  }, [focusRow, focusCol, getKey, handleKeyPress])

  const handleBack = useCallback(() => {
    // B acts as backspace when keyboard is open, unless value is empty then it closes
    if (value.length > 0) {
      setValue(prev => prev.slice(0, -1))
    } else {
      onClose()
    }
  }, [value, onClose])

  useGamepadNavigation({
    enabled: isOpen,
    onNavigate: handleNavigate,
    onConfirm: handleConfirm,
    onBack: handleBack
  })

  if (!isOpen) return null

  const renderKey = (key: string, rowIndex: number, colIndex: number) => {
    const isFocused = focusRow === rowIndex && focusCol === colIndex
    const isWide = ['SPACE', 'BACKSPACE', 'DONE', 'SHIFT', 'SYMBOLS', 'ABC'].includes(key)
    
    let content: React.ReactNode = key
    let extraClasses = ''
    
    switch (key) {
      case 'SHIFT':
        content = <ArrowBigUp size={20} className={layout === 'upper' ? 'fill-current' : ''} />
        extraClasses = layout === 'upper' ? 'bg-accent' : ''
        break
      case 'SYMBOLS':
        content = '!@#'
        extraClasses = layout === 'symbols' ? 'bg-accent' : ''
        break
      case 'ABC':
        content = 'ABC'
        break
      case 'SPACE':
        content = 'Space'
        break
      case 'BACKSPACE':
        content = <Delete size={20} />
        break
      case 'DONE':
        content = <><Check size={18} /> Done</>
        extraClasses = 'bg-green-600 hover:bg-green-500'
        break
    }

    return (
      <button
        key={`${rowIndex}-${colIndex}`}
        onClick={() => handleKeyPress(key)}
        className={`
          flex items-center justify-center gap-1 h-12 rounded-lg font-medium transition-all
          ${isWide ? 'px-4 min-w-[80px]' : 'w-12'}
          ${key === 'SPACE' ? 'flex-1' : ''}
          ${isFocused ? 'ring-2 ring-white scale-110 z-10 bg-accent' : 'bg-surface-700 hover:bg-surface-600'}
          ${extraClasses}
        `}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-[60] p-4">
      <div className="bg-surface-900 rounded-t-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Input preview */}
        <div className="p-4">
          <div className={`bg-surface-800 border border-surface-700 rounded-lg p-3 ${multiline ? 'min-h-[80px]' : 'min-h-[48px]'}`}>
            <span className="text-lg">{value}</span>
            <span className="inline-block w-0.5 h-5 bg-accent ml-0.5 animate-pulse" />
          </div>
        </div>

        {/* Keyboard */}
        <div className="p-4 pt-0 space-y-2">
          {currentLayout.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1.5 justify-center">
              {row.map((key, colIndex) => renderKey(key, rowIndex, colIndex))}
            </div>
          ))}
        </div>

        {/* Hints */}
        <div className="flex items-center justify-center gap-6 p-3 border-t border-surface-800 text-sm text-surface-400">
          <span><kbd className="px-2 py-1 bg-surface-700 rounded">A</kbd> Press key</span>
          <span><kbd className="px-2 py-1 bg-surface-700 rounded">B</kbd> Backspace</span>
          <span><kbd className="px-2 py-1 bg-surface-700 rounded">D-pad</kbd> Navigate</span>
        </div>
      </div>
    </div>
  )
}
