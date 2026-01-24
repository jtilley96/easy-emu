import '@testing-library/jest-dom/vitest'
import { vi, beforeEach, afterEach } from 'vitest'

// Ensure we have a proper DOM environment
if (typeof window !== 'undefined') {
  // Polyfill for TextEncoder/TextDecoder if missing
  if (typeof TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util')
    global.TextEncoder = TextEncoder
    global.TextDecoder = TextDecoder
  }
}

// Mock window.electronAPI globally
const mockElectronAPI = {
  config: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    getAll: vi.fn().mockResolvedValue({}),
  },
  library: {
    getGames: vi.fn().mockResolvedValue([]),
    getGame: vi.fn().mockResolvedValue(null),
    updateGame: vi.fn().mockResolvedValue(undefined),
    deleteGame: vi.fn().mockResolvedValue(undefined),
    scan: vi.fn().mockResolvedValue(undefined),
  },
  emulators: {
    getPlatformsWithEmulator: vi.fn().mockResolvedValue([]),
    launch: vi.fn().mockResolvedValue(undefined),
  },
  metadata: {
    scrapeGame: vi.fn().mockResolvedValue({ success: false, matched: false, gameId: '' }),
    scrapeAllGames: vi.fn().mockResolvedValue([]),
    cancelScrape: vi.fn().mockResolvedValue(undefined),
  },
  dialog: {
    selectFolder: vi.fn().mockResolvedValue(null),
    selectFile: vi.fn().mockResolvedValue(null),
  },
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
  platform: {
    get: vi.fn().mockReturnValue('win32'),
  },
  navigation: {
    onNavigate: vi.fn().mockReturnValue(() => {}),
  },
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

// Mock requestAnimationFrame for gamepad polling tests
let animationFrameId = 0
const animationFrameCallbacks = new Map<number, FrameRequestCallback>()

vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  const id = ++animationFrameId
  animationFrameCallbacks.set(id, callback)
  return id
})

vi.stubGlobal('cancelAnimationFrame', (id: number) => {
  animationFrameCallbacks.delete(id)
})

// Helper to advance animation frames in tests
export function flushAnimationFrames(count = 1) {
  for (let i = 0; i < count; i++) {
    const callbacks = Array.from(animationFrameCallbacks.entries())
    animationFrameCallbacks.clear()
    callbacks.forEach(([, callback]) => callback(performance.now()))
  }
}

// Mock navigator.getGamepads - preserve existing navigator properties
const mockGamepads: (Gamepad | null)[] = [null, null, null, null]

// Only mock getGamepads, don't replace entire navigator
Object.defineProperty(navigator, 'getGamepads', {
  value: vi.fn(() => mockGamepads),
  writable: true,
  configurable: true,
})

// Helper to set mock gamepad state
export function setMockGamepad(index: number, gamepad: Gamepad | null) {
  mockGamepads[index] = gamepad
}

// Helper to clear all mock gamepads
export function clearMockGamepads() {
  for (let i = 0; i < mockGamepads.length; i++) {
    mockGamepads[i] = null
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  clearMockGamepads()
  animationFrameCallbacks.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})
