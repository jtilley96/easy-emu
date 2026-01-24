import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

export type LibraryViewMode = 'grid' | 'list'

interface UIState {
  toasts: Toast[]
  libraryPlatformFilter: string | null
  libraryViewMode: LibraryViewMode

  // Actions
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  setLibraryPlatformFilter: (platform: string | null) => void
  setLibraryViewMode: (mode: LibraryViewMode) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  libraryPlatformFilter: null,
  libraryViewMode: 'grid',

  addToast: (type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const toast: Toast = { id, type, message, duration }

    set(state => ({
      toasts: [...state.toasts, toast]
    }))

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, duration)
    }
  },

  removeToast: (id: string) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },

  clearToasts: () => {
    set({ toasts: [] })
  },

  setLibraryPlatformFilter: (platform: string | null) => {
    set({ libraryPlatformFilter: platform })
    // Persist to config
    window.electronAPI.config.set('libraryPlatformFilter', platform).catch(error => {
      console.error('Failed to save library platform filter:', error)
    })
  },

  setLibraryViewMode: (mode: LibraryViewMode) => {
    set({ libraryViewMode: mode })
    // Persist to config
    window.electronAPI.config.set('libraryViewMode', mode).catch(error => {
      console.error('Failed to save library view mode:', error)
    })
  }
}))

// Load initial values from config on store creation
const loadLibraryPreferences = async () => {
  try {
    const viewMode = (await window.electronAPI.config.get('libraryViewMode')) as LibraryViewMode | undefined
    const platformFilter = (await window.electronAPI.config.get('libraryPlatformFilter')) as string | null | undefined
    
    if (viewMode || platformFilter !== undefined) {
      useUIStore.setState({
        libraryViewMode: viewMode || 'grid',
        libraryPlatformFilter: platformFilter ?? null
      })
    }
  } catch (error) {
    console.error('Failed to load library preferences:', error)
  }
}

// Load preferences asynchronously after store is created
loadLibraryPreferences()
