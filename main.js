/**
 * Ngajiku - Aplikasi Absensi Pengajian
 * Main Process (Electron)
 * Optimized for Raspberry Pi 4 (Low Resource)
 */

const { app, BrowserWindow, ipcMain, session, Menu } = require('electron');
const path = require('path');

// Database will be initialized after app is ready
let Database;
let s3Service;

// Enable debug mode
const DEBUG = true;

function log(...args) {
  if (DEBUG) {
    console.log('[MAIN]', new Date().toISOString(), ...args);
  }
}

function logError(...args) {
  console.error('[MAIN ERROR]', new Date().toISOString(), ...args);
}

// Disable hardware acceleration for Raspberry Pi stability
app.disableHardwareAcceleration();

// Reduce memory usage
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

// Allow running as root on Linux (untuk Raspberry Pi)
app.commandLine.appendSwitch('no-sandbox');

let mainWindow = null;
let db = null;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function createWindow() {
  log('Creating main window...');

  // Hilangkan menu bar (File, Help, dll)
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    fullscreen: false,
    kiosk: false,
    autoHideMenuBar: true,
    frame: false,  // Hilangkan title bar (close, minimize, restore)
    show: false,   // Jangan tampilkan dulu sampai maximize
    backgroundColor: '#FFF8F0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      backgroundThrottling: false,
      devTools: true,   // Enable DevTools
      // Enable camera access
      experimentalFeatures: false
    }
  });

  // Open DevTools for debugging (disabled in production)
  // mainWindow.webContents.openDevTools();

  // Log renderer console messages to main process terminal
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelStr = ['LOG', 'WARN', 'ERROR'][level] || 'INFO';
    console.log(`[RENDERER ${levelStr}] ${message}`);
  });

  // Set permission handler for camera
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));
  log('Window loaded');

  // Auto maximize saat window siap ditampilkan
  mainWindow.once('ready-to-show', () => {
    log('Window ready-to-show event fired');
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  // Fallback: jika ready-to-show tidak terpicu dalam 3 detik, paksa tampilkan
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      log('Fallback: forcing window to show');
      mainWindow.maximize();
      mainWindow.show();
      mainWindow.focus();
    }
  }, 3000);

  // Prevent window from closing accidentally
  mainWindow.on('close', (e) => {
    if (process.platform !== 'darwin') {
      // Allow close only via IPC or force close
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Disable context menu
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Garbage collection hint
  if (global.gc) {
    setInterval(() => {
      global.gc();
    }, 60000);
  }
}

// Initialize database
async function initDatabase() {
  log('Initializing database...');
  Database = require('./src/database');
  db = new Database();
  await db.init();
  log('Database initialized successfully');
  return db;
}

// Initialize S3 Service
function initS3Service() {
  log('Initializing S3 service...');
  s3Service = require('./src/s3Service');
  log('S3 service initialized');
  log('S3 config:', s3Service.getConfig());
}

// IPC Handlers
function setupIPC() {
  log('Setting up IPC handlers...');

  // Database operations (sql.js uses sync methods)
  ipcMain.handle('db:saveAbsensi', (event, data) => {
    log('IPC: saveAbsensi', data.nama);
    try {
      return db.saveAbsensi(data);
    } catch (error) {
      logError('Error saving absensi:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getUnsyncedAbsensi', () => {
    log('IPC: getUnsyncedAbsensi');
    try {
      return db.getUnsyncedAbsensi();
    } catch (error) {
      logError('Error getting unsynced:', error);
      throw error;
    }
  });

  ipcMain.handle('db:markAsSynced', (event, id) => {
    log('IPC: markAsSynced', id);
    try {
      return db.markAsSynced(id);
    } catch (error) {
      logError('Error marking synced:', error);
      throw error;
    }
  });

  ipcMain.handle('db:checkAlreadyAbsen', (event, { personId, acaraId, tanggal }) => {
    log('IPC: checkAlreadyAbsen', { personId, acaraId, tanggal });
    try {
      return db.checkAlreadyAbsen(personId, acaraId, tanggal);
    } catch (error) {
      logError('Error checking absen:', error);
      throw error;
    }
  });

  ipcMain.handle('db:getAllAbsensi', () => {
    log('IPC: getAllAbsensi');
    try {
      return db.getAllAbsensi();
    } catch (error) {
      logError('Error getting all absensi:', error);
      throw error;
    }
  });

  ipcMain.handle('db:deleteAbsensi', (event, id) => {
    log('IPC: deleteAbsensi', id);
    try {
      return db.deleteAbsensi(id);
    } catch (error) {
      logError('Error deleting absensi:', error);
      throw error;
    }
  });

  // S3 Storage operations
  ipcMain.handle('s3:uploadPhoto', async (event, { base64Data, personId, acaraId }) => {
    log('IPC: s3:uploadPhoto for person:', personId, 'acara:', acaraId);
    try {
      const result = await s3Service.uploadPhoto(base64Data, personId, acaraId);
      log('S3 upload result:', result.success ? 'success' : 'failed');
      return result;
    } catch (error) {
      logError('Error uploading to S3:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('s3:getConfig', () => {
    log('IPC: s3:getConfig');
    return s3Service.getConfig();
  });

  ipcMain.handle('s3:updateConfig', (event, config) => {
    log('IPC: s3:updateConfig');
    s3Service.updateConfig(config);
    return { success: true };
  });

  ipcMain.handle('s3:testConnection', async () => {
    log('IPC: s3:testConnection');
    try {
      return await s3Service.testConnection();
    } catch (error) {
      logError('S3 connection test error:', error);
      return { success: false, error: error.message };
    }
  });

  // App control
  ipcMain.handle('app:quit', () => {
    log('IPC: quit');
    app.quit();
  });

  ipcMain.handle('app:minimize', () => {
    log('IPC: minimize');
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('app:toggleFullscreen', () => {
    log('IPC: toggleFullscreen');
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  // Get app info
  ipcMain.handle('app:getInfo', () => {
    log('IPC: getInfo');
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch
    };
  });

  // ==================== AUTOSTART HANDLERS ====================

  // Get autostart status
  ipcMain.handle('app:getAutostart', () => {
    log('IPC: getAutostart');
    try {
      const loginSettings = app.getLoginItemSettings();
      return {
        success: true,
        enabled: loginSettings.openAtLogin
      };
    } catch (error) {
      logError('Failed to get autostart status:', error);
      return { success: false, enabled: false, error: error.message };
    }
  });

  // Set autostart on/off
  ipcMain.handle('app:setAutostart', async (event, enabled) => {
    log('IPC: setAutostart', enabled);
    try {
      // For Windows and Linux, use Electron's built-in method
      if (process.platform === 'win32' || process.platform === 'linux') {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          openAsHidden: false,
          // For Linux, specify the path to the .desktop file or executable
          path: process.execPath,
          args: []
        });

        // Verify the setting was applied
        const settings = app.getLoginItemSettings();
        log('Autostart settings after change:', settings);

        return {
          success: true,
          enabled: settings.openAtLogin
        };
      } else {
        // macOS or other platforms
        app.setLoginItemSettings({
          openAtLogin: enabled
        });
        return {
          success: true,
          enabled: enabled
        };
      }
    } catch (error) {
      logError('Failed to set autostart:', error);
      return { success: false, error: error.message };
    }
  });

  log('IPC handlers setup complete');
}

// App lifecycle
app.whenReady().then(async () => {
  log('App ready, starting initialization...');
  try {
    await initDatabase();
    initS3Service();
    setupIPC();
    createWindow();
    log('Application started successfully');
  } catch (error) {
    logError('Failed to initialize:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
