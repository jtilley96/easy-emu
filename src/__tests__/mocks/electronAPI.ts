import { vi } from 'vitest'
import type { Game, ScrapeResult } from '../../types'

/**
 * Factory for creating mock electronAPI implementations
 */
export function createMockElectronAPI() {
  return {
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
}

/**
 * Install mock electronAPI on window object
 */
export function installMockElectronAPI() {
  const mock = createMockElectronAPI()
  Object.defineProperty(window, 'electronAPI', {
    value: mock,
    writable: true,
    configurable: true
  })
  return mock
}

/**
 * Get the current mock electronAPI
 */
export function getMockElectronAPI() {
  return window.electronAPI as unknown as ReturnType<typeof createMockElectronAPI>
}

/**
 * Reset all electronAPI mocks
 */
export function resetElectronAPIMocks() {
  const api = getMockElectronAPI()
  Object.values(api).forEach(namespace => {
    Object.values(namespace).forEach(fn => {
      if (typeof fn === 'function' && 'mockClear' in fn) {
        (fn as ReturnType<typeof vi.fn>).mockClear()
      }
    })
  })
}

/**
 * Create a mock game for testing
 */
export function createMockGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'game-1',
    title: 'Test Game',
    platform: 'nes',
    path: '/path/to/game.nes',
    coverPath: undefined,
    backdropPath: undefined,
    description: undefined,
    developer: undefined,
    publisher: undefined,
    releaseDate: undefined,
    genres: undefined,
    rating: undefined,
    playTime: 0,
    lastPlayed: undefined,
    addedAt: new Date().toISOString(),
    isFavorite: false,
    preferredEmulator: undefined,
    ...overrides
  }
}

/**
 * Create a mock scrape result
 */
export function createMockScrapeResult(overrides: Partial<ScrapeResult> = {}): ScrapeResult {
  return {
    gameId: 'game-1',
    success: true,
    matched: true,
    title: 'Test Game',
    ...overrides
  }
}
