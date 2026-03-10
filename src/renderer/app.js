/**
 * Ngajiku - Main Application Orchestrator
 * Initializes DOM elements, event listeners, and boots the application.
 *
 * Module loading order (via script tags in index.html):
 *   1. state.js      - AppState, state, elements, log/logError
 *   2. ui.js         - Modals, toasts, formatters, clock, DEFAULT_USER_SVG
 *   3. camera.js     - Camera init/stop/capture
 *   4. barcode.js    - Barcode scanner input handling & parsing
 *   5. events.js     - Event loading, filtering, swiper, search
 *   6. sync.js       - Sync management, stats, connection check
 *   7. history.js    - Attendance history loading & rendering
 *   8. navigation.js - Screen transitions, validation, photo flow, submit
 *   9. api.js        - ApiService HTTP client
 *  10. app.js        - This file (orchestrator)
 */

// ==================== INITIALIZATION ====================
function initElements() {
  // Get all DOM elements
  elements.screenEventSelect = document.getElementById('screenEventSelect');
  elements.screenScan = document.getElementById('screenScan');
  elements.screenValidation = document.getElementById('screenValidation');
  elements.screenPhoto = document.getElementById('screenPhoto');
  elements.screenSuccess = document.getElementById('screenSuccess');

  elements.currentTime = document.getElementById('currentTime');
  elements.connectionStatus = document.getElementById('connectionStatus');
  elements.btnSync = document.getElementById('btnSync');
  elements.btnSettings = document.getElementById('btnSettings');
  elements.btnResizeWindow = document.getElementById('btnResizeWindow');

  elements.eventList = document.getElementById('eventList');
  elements.eventSwiper = document.getElementById('eventSwiper');
  elements.swiperPrev = document.getElementById('swiperPrev');
  elements.swiperNext = document.getElementById('swiperNext');
  elements.swiperDots = document.getElementById('swiperDots');
  elements.noEventMessage = document.getElementById('noEventMessage');
  elements.loadingEvents = document.getElementById('loadingEvents');
  elements.btnRefreshEvents = document.getElementById('btnRefreshEvents');

  // Search and Event Sections
  elements.eventSearchInput = document.getElementById('eventSearchInput');
  elements.btnClearSearch = document.getElementById('btnClearSearch');
  elements.todayEventsSection = document.getElementById('todayEventsSection');
  elements.otherEventsSection = document.getElementById('otherEventsSection');
  elements.otherEventsList = document.getElementById('otherEventsList');
  elements.noSearchResults = document.getElementById('noSearchResults');
  elements.btnClearSearchResults = document.getElementById('btnClearSearchResults');

  elements.barcodeInput = document.getElementById('barcodeInput');
  elements.noPhotoCheckbox = document.getElementById('noPhotoCheckbox');
  elements.scanError = document.getElementById('scanError');
  elements.scanErrorText = document.getElementById('scanErrorText');
  elements.selectedEventName = document.getElementById('selectedEventName');
  elements.selectedEventDate = document.getElementById('selectedEventDate');
  elements.todayCount = document.getElementById('todayCount');
  elements.unsyncedCount = document.getElementById('unsyncedCount');
  elements.btnBackToEvents = document.getElementById('btnBackToEvents');

  // Attendance History Panel
  elements.historyList = document.getElementById('historyList');
  elements.historyLoading = document.getElementById('historyLoading');
  elements.historyEmpty = document.getElementById('historyEmpty');
  elements.historyCount = document.getElementById('historyCount');
  elements.btnRefreshHistory = document.getElementById('btnRefreshHistory');

  elements.userName = document.getElementById('userName');
  elements.userPhone = document.getElementById('userPhone');
  elements.userBirthdate = document.getElementById('userBirthdate');
  elements.timerProgress = document.getElementById('timerProgress');
  elements.timerCount = document.getElementById('timerCount');
  elements.timerLabel = document.getElementById('timerLabel');
  elements.timerRing = document.querySelector('.timer-ring');

  elements.cameraPreview = document.getElementById('cameraPreview');
  elements.photoCanvas = document.getElementById('photoCanvas');
  elements.capturedPhoto = document.getElementById('capturedPhoto');
  elements.cameraOverlay = document.getElementById('cameraOverlay');
  elements.cameraError = document.getElementById('cameraError');
  elements.photoUserName = document.getElementById('photoUserName');
  elements.photoInstruction = document.getElementById('photoInstruction');
  elements.btnRetakePhoto = document.getElementById('btnRetakePhoto');
  elements.btnConfirmPhoto = document.getElementById('btnConfirmPhoto');

  elements.successPhoto = document.getElementById('successPhoto');
  elements.successAvatarFallback = document.getElementById('successAvatarFallback');
  elements.successName = document.getElementById('successName');
  elements.successEvent = document.getElementById('successEvent');
  elements.successTime = document.getElementById('successTime');
  elements.successCountdown = document.getElementById('successCountdown');

  elements.modalAlreadyAttended = document.getElementById('modalAlreadyAttended');
  elements.btnCloseAlreadyAttended = document.getElementById('btnCloseAlreadyAttended');
  elements.modalSync = document.getElementById('modalSync');
  elements.btnCloseSync = document.getElementById('btnCloseSync');
  elements.syncTotal = document.getElementById('syncTotal');
  elements.syncPending = document.getElementById('syncPending');
  elements.syncSuccess = document.getElementById('syncSuccess');
  elements.syncProgress = document.getElementById('syncProgress');
  elements.syncProgressBar = document.getElementById('syncProgressBar');
  elements.syncProgressText = document.getElementById('syncProgressText');
  elements.unsyncedList = document.getElementById('unsyncedList');
  elements.btnStartSync = document.getElementById('btnStartSync');
  elements.btnClearLocalData = document.getElementById('btnClearLocalData');
  elements.modalConfirmDelete = document.getElementById('modalConfirmDelete');
  elements.btnCancelDelete = document.getElementById('btnCancelDelete');
  elements.btnConfirmDelete = document.getElementById('btnConfirmDelete');
  elements.modalSettings = document.getElementById('modalSettings');
  elements.btnCloseSettings = document.getElementById('btnCloseSettings');
  elements.appVersion = document.getElementById('appVersion');
  elements.appPlatform = document.getElementById('appPlatform');
  elements.dbStats = document.getElementById('dbStats');
  elements.btnExitApp = document.getElementById('btnExitApp');
  elements.toggleAutostart = document.getElementById('toggleAutostart');

  elements.toastContainer = document.getElementById('toastContainer');
}

function initEventListeners() {
  // Header buttons
  elements.btnSync.addEventListener('click', openSyncModal);

  // Resize window toggle button
  let isResizedTo1024 = false;
  elements.btnResizeWindow.addEventListener('click', async () => {
    try {
      if (isResizedTo1024) {
        await window.electronAPI.maximizeWindow();
        elements.btnResizeWindow.classList.remove('active');
        elements.btnResizeWindow.title = 'Mode 1024x600';
        isResizedTo1024 = false;
      } else {
        await window.electronAPI.resizeTo1024();
        elements.btnResizeWindow.classList.add('active');
        elements.btnResizeWindow.title = 'Maximize Window';
        isResizedTo1024 = true;
      }
    } catch (error) {
      console.error('Resize window error:', error);
    }
  });

  elements.btnSettings.addEventListener('click', async () => {
    showModal('modalSettings');
    try {
      const info = await window.electronAPI.getAppInfo();
      elements.appVersion.textContent = info.version;
      elements.appPlatform.textContent = `${info.platform} (${info.arch})`;

      const allData = await window.electronAPI.getAllAbsensi();
      const unsyncedData = await window.electronAPI.getUnsyncedAbsensi();
      elements.dbStats.textContent = `${allData.length} total, ${unsyncedData.length} belum sinkron`;

      // Load autostart status
      const autostartStatus = await window.electronAPI.getAutostart();
      if (autostartStatus.success) {
        elements.toggleAutostart.checked = autostartStatus.enabled;
      }
    } catch (error) {
      console.error('Get app info error:', error);
    }
  });

  // Event selection
  elements.btnRefreshEvents.addEventListener('click', loadEvents);

  // Search functionality
  if (elements.eventSearchInput) {
    elements.eventSearchInput.addEventListener('input', (e) => {
      handleEventSearch(e.target.value);
    });

    elements.eventSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearEventSearch();
        e.target.blur();
      }
    });
  }

  if (elements.btnClearSearch) {
    elements.btnClearSearch.addEventListener('click', clearEventSearch);
  }

  if (elements.btnClearSearchResults) {
    elements.btnClearSearchResults.addEventListener('click', clearEventSearch);
  }

  // Scan screen
  elements.btnBackToEvents.addEventListener('click', goToEventSelect);

  // Attendance history refresh
  elements.btnRefreshHistory.addEventListener('click', loadAttendanceHistory);

  // Photo screen
  elements.btnRetakePhoto.addEventListener('click', retakePhoto);
  elements.btnConfirmPhoto.addEventListener('click', confirmPhoto);

  // Modal close buttons
  elements.btnCloseAlreadyAttended.addEventListener('click', () => {
    hideModal('modalAlreadyAttended');
    if (elements.barcodeInput) {
      elements.barcodeInput.focus();
    }
  });
  elements.btnCloseSync.addEventListener('click', () => hideModal('modalSync'));
  elements.btnCloseSettings.addEventListener('click', () => hideModal('modalSettings'));

  // Autostart toggle
  elements.toggleAutostart.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    try {
      const result = await window.electronAPI.setAutostart(enabled);
      if (result.success) {
        showToast(enabled ? 'Aplikasi akan berjalan saat startup' : 'Autostart dinonaktifkan', 'success');
        log('Autostart set to:', result.enabled);
      } else {
        showToast('Gagal mengubah pengaturan autostart', 'error');
        // Revert toggle if failed
        e.target.checked = !enabled;
      }
    } catch (error) {
      logError('Autostart toggle error:', error);
      showToast('Gagal mengubah pengaturan autostart', 'error');
      e.target.checked = !enabled;
    }
  });

  // Sync
  elements.btnStartSync.addEventListener('click', startSync);

  // Clear local data
  elements.btnClearLocalData.addEventListener('click', () => {
    showModal('modalConfirmDelete');
  });

  elements.btnCancelDelete.addEventListener('click', () => {
    hideModal('modalConfirmDelete');
  });

  elements.btnConfirmDelete.addEventListener('click', async () => {
    await clearLocalData();
  });

  // Exit app
  elements.btnExitApp.addEventListener('click', () => {
    if (confirm('Yakin ingin keluar dari aplikasi?')) {
      window.electronAPI.quit();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to go back
    if (e.key === 'Escape') {
      if (state.current === AppState.SCANNING) {
        goToEventSelect();
      }
    }

    // F5 to refresh events
    if (e.key === 'F5') {
      e.preventDefault();
      if (state.current === AppState.EVENT_SELECT) {
        loadEvents();
      }
    }

    // F11 to toggle fullscreen
    if (e.key === 'F11') {
      e.preventDefault();
      window.electronAPI.toggleFullscreen();
    }
  });
}

async function init() {
  log('========================================');
  log('Initializing Ngajiku application...');
  log('========================================');

  try {
    log('Step 1: Init DOM elements...');
    initElements();

    log('Step 2: Init event listeners...');
    initEventListeners();

    log('Step 3: Init swiper...');
    initSwiper();

    log('Step 4: Init barcode scanner...');
    initBarcodeScanner();

    // Set "Tanpa Photo" checkbox to checked by default
    if (elements.noPhotoCheckbox) {
      elements.noPhotoCheckbox.checked = true;
      log('Set noPhotoCheckbox default to checked');
    }

    // Update clock every second
    log('Step 5: Starting clock...');
    updateClock();
    setInterval(updateClock, 1000);

    // Check connection every 30 seconds
    log('Step 6: Checking connection...');
    checkConnection();
    setInterval(checkConnection, 30000);

    // Load events
    log('Step 7: Loading events...');
    await loadEvents();

    log('========================================');
    log('Application initialized successfully!');
    log('========================================');
  } catch (error) {
    logError('Initialization failed:', error);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  log('DOM Content Loaded, starting init...');
  init();
});

// Memory management - clean up on unload
window.addEventListener('beforeunload', () => {
  stopCamera();
  stopAttendanceHistoryRefresh();
  clearInterval(validationTimerInterval);
  clearInterval(successTimerInterval);
});
