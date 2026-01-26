import { app, BrowserWindow, ipcMain, dialog, shell, protocol, session } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { initializeServices, getConfigValue, checkForUpdates } from './services/index'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Register custom schemes before app ready (required for custom protocols)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-image',
    privileges: {
      bypassCSP: true,
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  },
  {
    scheme: 'local-rom',
    privileges: {
      bypassCSP: true,
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
])

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? true : false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  // Remove menu bar on Windows/Linux
  if (process.platform !== 'darwin') {
    mainWindow.setMenuBarVisibility(false)
  }

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(async () => {
  // Configure Content Security Policy to allow EmulatorJS CDN
  // Note: 'unsafe-eval' is required for EmulatorJS to function properly.
  // Electron will show a security warning in development about this, but the warning
  // will not appear in production builds. This is a known limitation when using
  // EmulatorJS which requires dynamic code evaluation.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' local-image: local-rom: blob: data:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.emulatorjs.org blob:; " +
          "style-src 'self' 'unsafe-inline' https://cdn.emulatorjs.org; " +
          "connect-src 'self' local-image: local-rom: https://cdn.emulatorjs.org https://hasheous.org https://*.hasheous.org data: blob:; " +
          "img-src 'self' local-image: data: blob: https:; " +
          "worker-src 'self' blob:; " +
          "media-src 'self' blob: data:; " +
          "font-src 'self' data: blob:; " +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'none';"
        ]
      }
    })
  })

  // Register local-image protocol to serve local image files (cover, backdrop, screenshots)
  protocol.handle('local-image', (request) => {
    try {
      const u = new URL(request.url)
      const encoded = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname
      const filePath = decodeURIComponent(encoded)
      const ext = path.extname(filePath).toLowerCase()
      const mime: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
      }
      const contentType = mime[ext] ?? 'application/octet-stream'
      const buffer = fs.readFileSync(filePath)
      return new Response(buffer, { headers: { 'Content-Type': contentType } })
    } catch (err) {
      console.error('local-image protocol error:', err)
      return new Response(null, { status: 404 })
    }
  })

  // Register local-rom protocol to serve ROM files for the embedded emulator
  protocol.handle('local-rom', (request) => {
    try {
      const u = new URL(request.url)
      const encoded = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname
      const filePath = decodeURIComponent(encoded)
      const buffer = fs.readFileSync(filePath)
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Access-Control-Allow-Origin': '*'
        }
      })
    } catch (err) {
      console.error('local-rom protocol error:', err)
      return new Response(null, { status: 404 })
    }
  })

  createWindow()

  // Initialize all services (config, library, emulators, metadata)
  initializeServices(mainWindow)

  // Check for updates on startup if enabled
  const shouldCheckUpdates = getConfigValue('checkUpdates')
  if (shouldCheckUpdates !== false) {
    // Delay the check to not block startup
    setTimeout(async () => {
      try {
        const updateInfo = await checkForUpdates()
        if (updateInfo?.hasUpdate && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater:updateAvailable', updateInfo)
        }
      } catch (error) {
        console.error('Startup update check failed:', error)
      }
    }, 5000)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      initializeServices(mainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers

// Window controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.handle('window:close', () => {
  mainWindow?.close()
})

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false
})

// Dialog handlers
ipcMain.handle('dialog:openDirectory', async (_event, defaultPath?: string) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    defaultPath: defaultPath
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openFile', async (_event, filters?: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: filters || []
  })
  return result.canceled ? null : result.filePaths[0]
})

// Shell handlers
ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  return shell.openPath(filePath)
})

ipcMain.handle('shell:showItemInFolder', (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  return shell.openExternal(url)
})

// App info
ipcMain.handle('app:getPath', (_event, name: 'userData' | 'home' | 'appData' | 'documents') => {
  return app.getPath(name)
})

ipcMain.handle('app:getVersion', () => {
  return app.getVersion()
})

ipcMain.handle('app:getPlatform', () => {
  return process.platform
})
