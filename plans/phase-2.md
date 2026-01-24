# Phase 2: Complete Core Features

## Overview

Connect the frontend UI to actual backend functionality, replacing all placeholder/hardcoded data with real data flows.

## Current State Analysis

### Fully Implemented (Phase 1 + 1.5)
- Project scaffold (Electron + React + TypeScript + Vite)
- Main window with dark theme, custom title bar
- Navigation structure (Sidebar, Layout, routing)
- IPC communication pattern with full preload bridge
- First-run setup wizard with all steps
- Backend services: config, library, emulators, metadata, bios
- ROM folder persistence and scanning
- Emulator detection with download URLs
- BIOS path configuration and status checking

### Partially Implemented (needs completion)
1. **Settings Page** - UI exists but uses hardcoded placeholder data
2. **Metadata Scraping** - Backend exists but bulk scraping unimplemented
3. **Library Features** - Quick Access filters non-functional
4. **Game Details Page** - Action buttons have no functionality

---

## Implementation Tasks

### Task 2.1: Settings Page Backend Integration

**Files:** `src/pages/Settings.tsx`, `src/store/appStore.ts`

| Subtask | Description |
|---------|-------------|
| 2.1.1 Emulators Settings | Replace hardcoded array with `emulators.detect()`, add Browse/Re-detect buttons |
| 2.1.2 BIOS Settings | Replace hardcoded array with `bios.checkStatus()`, connect Browse button |
| 2.1.3 Paths Settings | Load paths from config, allow changing via dialog, Open button uses `shell.openPath()` |
| 2.1.4 Metadata Settings | Persist ScreenScraper credentials, region, autoScrape to config |
| 2.1.5 General Settings | Persist startMinimized and checkUpdates to config |

---

### Task 2.2: Metadata Scraping UI Integration

**Files:** `src/pages/GameDetails.tsx`, `src/pages/Library.tsx`, `electron/services/metadata.ts`, `src/store/libraryStore.ts`

| Subtask | Description |
|---------|-------------|
| 2.2.1 Single Game Scraping | Connect "Re-scrape metadata" button, show loading state, refresh after |
| 2.2.2 Bulk Scraping | Implement `scrapeAllGames()` with progress events, add "Scrape All" button |
| 2.2.3 Auto-scrape on Import | Check `autoScrape` config when new games added, queue scrape requests |

---

### Task 2.3: Library Quick Access Filters

**Files:** `src/pages/Library.tsx`, `src/components/Sidebar.tsx`

| Subtask | Description |
|---------|-------------|
| 2.3.1 Filter Query Params | Parse `?filter=recent` and `?filter=favorites` from URL |
| 2.3.2 Favorites Toggle | Add star icon to GameCard, connect to `toggleFavorite()` |
| 2.3.3 Recently Played | Sort by `lastPlayed` descending, show empty state |

---

### Task 2.4: Game Management Actions

**Files:** `src/pages/GameDetails.tsx`, `src/pages/Library.tsx`, `src/store/libraryStore.ts`

| Subtask | Description |
|---------|-------------|
| 2.4.1 Edit Metadata Modal | Create modal for editing title, description, genres, rating |
| 2.4.2 Game Settings Modal | Per-game emulator selection, custom launch arguments |
| 2.4.3 Delete Game | Add confirmation dialog, connect to `library.deleteGame()` |
| 2.4.4 Context Menu | Right-click menu on GameCard: Play, Edit, Scrape, Favorite, Delete |

---

### Task 2.5: Library Scan Improvements

**Files:** `electron/services/library.ts`, `src/store/libraryStore.ts`, `src/pages/Library.tsx`

| Subtask | Description |
|---------|-------------|
| 2.5.1 Scan Progress Events | Emit IPC events with `{ total, scanned, current }`, update UI |
| 2.5.2 Platform Detection | Better multi-disc handling, use PLATFORMS constants |
| 2.5.3 Scan Results Summary | Toast showing "Added X new games" after scan |

---

### Task 2.6: Error Handling & User Feedback

**Files:** `src/components/Toast.tsx` (new), `src/store/uiStore.ts` (new)

| Subtask | Description |
|---------|-------------|
| 2.6.1 Toast System | Global toast component with success/error/info variants |
| 2.6.2 Error States | Handle launch failures, scrape failures with retry option |
| 2.6.3 Loading States | Consistent loading indicators, skeleton loaders for game cards |

---

## Implementation Order

1. **Task 2.1** - Settings Backend (foundation for everything else)
2. **Task 2.6** - Toast System (needed for user feedback)
3. **Task 2.5** - Scan Improvements (better library population)
4. **Task 2.3** - Quick Access Filters (low-hanging fruit, improves UX)
5. **Task 2.4** - Game Management (core feature completion)
6. **Task 2.2** - Metadata Scraping (polish and completeness)

---

## Files Summary

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Replace all hardcoded arrays with API calls |
| `src/pages/GameDetails.tsx` | Connect action buttons to real functionality |
| `src/pages/Library.tsx` | Add filter parsing, context menus, scan progress UI |
| `src/store/libraryStore.ts` | Add scrape methods, scan progress state, filter logic |
| `src/store/uiStore.ts` | **NEW** - Toast state management |
| `src/components/Toast.tsx` | **NEW** - Global toast notification component |
| `src/components/EditMetadataModal.tsx` | **NEW** - Modal for editing game metadata |
| `src/components/GameSettingsModal.tsx` | **NEW** - Modal for per-game settings |
| `electron/services/metadata.ts` | Implement `scrapeAllGames()`, add progress events |
| `electron/services/library.ts` | Add scan progress IPC events |

---

## Verification

After Phase 2 completion:
1. Settings page shows real emulator/BIOS detection results
2. Settings changes persist across app restarts
3. "Recently Played" and "Favorites" filters work in sidebar
4. Can favorite/unfavorite games from library
5. Can edit game metadata from details page
6. Can delete games from library
7. Scan shows progress indicator
8. Toast notifications appear for actions
9. Metadata scraping works from game details
