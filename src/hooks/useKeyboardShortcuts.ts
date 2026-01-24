import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[]
  action: string
}

/**
 * Parse a shortcut string like "ctrl+f" or "F11" into components
 */
export function parseShortcut(shortcut: string): { key: string; modifiers: string[] } {
  const parts = shortcut.toLowerCase().split('+')
  const key = parts[parts.length - 1]
  const modifiers = parts.slice(0, -1)
  return { key, modifiers }
}

/**
 * Format a shortcut for display
 */
export function formatShortcut(shortcut: string): string {
  const { key, modifiers } = parseShortcut(shortcut)
  const parts: string[] = []

  if (modifiers.includes('ctrl')) parts.push('Ctrl')
  if (modifiers.includes('alt')) parts.push('Alt')
  if (modifiers.includes('shift')) parts.push('Shift')
  if (modifiers.includes('meta')) parts.push('⌘')

  // Format the key nicely
  let displayKey = key.toUpperCase()
  if (key === 'escape') displayKey = 'Esc'
  if (key === ' ') displayKey = 'Space'
  if (key === 'arrowup') displayKey = '↑'
  if (key === 'arrowdown') displayKey = '↓'
  if (key === 'arrowleft') displayKey = '←'
  if (key === 'arrowright') displayKey = '→'
  if (key === 'enter') displayKey = 'Enter'
  if (key === 'tab') displayKey = 'Tab'
  if (key === 'backspace') displayKey = 'Backspace'
  if (key === 'delete') displayKey = 'Delete'

  parts.push(displayKey)
  return parts.join('+')
}

/**
 * Check if a keyboard event matches a shortcut string
 */
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const { key, modifiers } = parseShortcut(shortcut)

  // Check key
  if (event.key.toLowerCase() !== key.toLowerCase()) {
    return false
  }

  // Check modifiers
  const hasCtrl = modifiers.includes('ctrl')
  const hasAlt = modifiers.includes('alt')
  const hasShift = modifiers.includes('shift')
  const hasMeta = modifiers.includes('meta')

  if (hasCtrl !== event.ctrlKey) return false
  if (hasAlt !== event.altKey) return false
  if (hasShift !== event.shiftKey) return false
  if (hasMeta !== event.metaKey) return false

  return true
}

/**
 * Hook for handling keyboard shortcuts
 * @param shortcuts Map of shortcut strings to action names
 * @param handlers Map of action names to handler functions
 * @param enabled Whether shortcuts are active (default true)
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, string>,  // action -> shortcut string
  handlers: Record<string, () => void>,
  enabled: boolean = true
) {
  const shortcutsRef = useRef(shortcuts)
  const handlersRef = useRef(handlers)

  // Update refs when props change
  useEffect(() => {
    shortcutsRef.current = shortcuts
    handlersRef.current = handlers
  }, [shortcuts, handlers])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts when typing in inputs
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    ) {
      // Allow Escape in inputs
      if (event.key !== 'Escape') {
        return
      }
    }

    // Check each shortcut
    for (const [action, shortcut] of Object.entries(shortcutsRef.current)) {
      if (matchesShortcut(event, shortcut)) {
        const handler = handlersRef.current[action]
        if (handler) {
          event.preventDefault()
          handler()
          return
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

/**
 * Hook for capturing a key press (for rebinding shortcuts)
 */
export function useKeyCapture(
  onCapture: (shortcut: string) => void,
  enabled: boolean = false
) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      event.stopPropagation()

      // Build shortcut string
      const parts: string[] = []

      if (event.ctrlKey) parts.push('ctrl')
      if (event.altKey) parts.push('alt')
      if (event.shiftKey) parts.push('shift')
      if (event.metaKey) parts.push('meta')

      // Ignore lone modifier keys
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
        return
      }

      parts.push(event.key.toLowerCase())
      onCapture(parts.join('+'))
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, onCapture])
}

export default useKeyboardShortcuts
