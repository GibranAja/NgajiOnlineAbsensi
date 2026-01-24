/**
 * Preload Script - Secure Bridge between Main and Renderer
 * Context Isolation enabled for security
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  saveAbsensi: (data) => ipcRenderer.invoke('db:saveAbsensi', data),
  getUnsyncedAbsensi: () => ipcRenderer.invoke('db:getUnsyncedAbsensi'),
  markAsSynced: (id) => ipcRenderer.invoke('db:markAsSynced', id),
  checkAlreadyAbsen: (personId, acaraId, tanggal) =>
    ipcRenderer.invoke('db:checkAlreadyAbsen', { personId, acaraId, tanggal }),
  getAllAbsensi: () => ipcRenderer.invoke('db:getAllAbsensi'),
  deleteAbsensi: (id) => ipcRenderer.invoke('db:deleteAbsensi', id),
  clearAllAbsensi: () => ipcRenderer.invoke('db:clearAllAbsensi'),

  // S3 Storage operations
  uploadPhotoToS3: (base64Data, personId, acaraId) =>
    ipcRenderer.invoke('s3:uploadPhoto', { base64Data, personId, acaraId }),
  getS3Config: () => ipcRenderer.invoke('s3:getConfig'),
  updateS3Config: (config) => ipcRenderer.invoke('s3:updateConfig', config),
  testS3Connection: () => ipcRenderer.invoke('s3:testConnection'),

  // App control
  quit: () => ipcRenderer.invoke('app:quit'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  toggleFullscreen: () => ipcRenderer.invoke('app:toggleFullscreen'),
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

  // Autostart control
  getAutostart: () => ipcRenderer.invoke('app:getAutostart'),
  setAutostart: (enabled) => ipcRenderer.invoke('app:setAutostart', enabled)
});

// Expose utility functions
contextBridge.exposeInMainWorld('utils', {
  // Get current date in Jakarta timezone
  getJakartaDate: () => {
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return jakartaTime;
  },

  // Format date to ISO string in Jakarta timezone
  formatJakartaISO: () => {
    const now = new Date();
    const jakartaOffset = 7 * 60; // UTC+7
    const utcOffset = now.getTimezoneOffset();
    const jakartaTime = new Date(now.getTime() + (jakartaOffset + utcOffset) * 60000);
    return jakartaTime.toISOString();
  },

  // Get date string YYYY-MM-DD in Jakarta timezone
  getJakartaDateString: () => {
    const now = new Date();
    const options = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  },

  // Get full timestamp in Jakarta timezone (ISO format with Jakarta time)
  getJakartaTimestamp: () => {
    const now = new Date();
    const options = {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`;
  }
});

console.log('Preload script loaded successfully');
