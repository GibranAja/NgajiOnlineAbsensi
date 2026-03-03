/**
 * Ngajiku - Main Application Logic
 * State-based attendance system with offline-first architecture
 * Optimized for Raspberry Pi 4
 */

// ==================== DEBUG LOGGING ====================
const DEBUG = true;

function log(...args) {
  if (DEBUG) {
    console.log('[APP]', new Date().toLocaleTimeString(), ...args);
  }
}

function logError(...args) {
  console.error('[APP ERROR]', new Date().toLocaleTimeString(), ...args);
}

// ==================== STATE MANAGEMENT ====================
const AppState = {
  IDLE: 'idle',
  EVENT_SELECT: 'event_select',
  SCANNING: 'scanning',
  VALIDATION: 'validation',
  PHOTO_CAPTURE: 'photo_capture',
  SUCCESS: 'success'
};

let state = {
  current: AppState.EVENT_SELECT,
  selectedEvent: null,
  scannedUser: null,
  capturedPhoto: null,
  events: [],
  allEvents: [],        // All events from API
  todayEvents: [],      // Events for today
  otherEvents: [],      // Events for other days
  searchQuery: '',      // Current search query
  isOnline: false,
  swiperIndex: 0
};

// ==================== DOM ELEMENTS ====================
const elements = {
  // Screens
  screenEventSelect: null,
  screenScan: null,
  screenValidation: null,
  screenPhoto: null,
  screenSuccess: null,

  // Header
  currentTime: null,
  connectionStatus: null,
  btnSync: null,
  btnSettings: null,
  btnResizeWindow: null,

  // Event Selection
  eventList: null,
  eventSwiper: null,
  swiperPrev: null,
  swiperNext: null,
  swiperDots: null,
  noEventMessage: null,
  loadingEvents: null,
  btnRefreshEvents: null,

  // Search and Event Sections
  eventSearchInput: null,
  btnClearSearch: null,
  todayEventsSection: null,
  otherEventsSection: null,
  otherEventsList: null,
  noSearchResults: null,
  btnClearSearchResults: null,

  // No Photo Option
  noPhotoCheckbox: null,

  // Scan Screen
  barcodeInput: null,
  scanError: null,
  scanErrorText: null,
  selectedEventName: null,
  selectedEventDate: null,
  todayCount: null,
  unsyncedCount: null,
  btnBackToEvents: null,

  // Attendance History Panel
  historyList: null,
  historyLoading: null,
  historyEmpty: null,
  historyCount: null,
  btnRefreshHistory: null,

  // Validation Screen
  userName: null,
  userPhone: null,
  userBirthdate: null,
  timerProgress: null,
  timerCount: null,
  timerLabel: null,
  timerRing: null,

  // Photo Screen
  cameraPreview: null,
  photoCanvas: null,
  capturedPhoto: null,
  cameraOverlay: null,
  cameraError: null,
  photoUserName: null,
  photoInstruction: null,
  btnRetakePhoto: null,
  btnConfirmPhoto: null,

  // Success Screen
  successPhoto: null,
  successAvatarFallback: null,
  successName: null,
  successEvent: null,
  successTime: null,
  successCountdown: null,

  // Modals
  modalAlreadyAttended: null,
  btnCloseAlreadyAttended: null,
  modalSync: null,
  btnCloseSync: null,
  syncTotal: null,
  syncPending: null,
  syncSuccess: null,
  syncProgress: null,
  syncProgressBar: null,
  syncProgressText: null,
  unsyncedList: null,
  btnStartSync: null,
  btnClearLocalData: null,
  modalConfirmDelete: null,
  btnCancelDelete: null,
  btnConfirmDelete: null,
  modalSettings: null,
  btnCloseSettings: null,
  appVersion: null,
  appPlatform: null,
  dbStats: null,
  toggleAutostart: null,
  btnExitApp: null,

  // Toast
  toastContainer: null
};

// ==================== CAMERA MANAGEMENT ====================
let mediaStream = null;

async function initCamera() {
  try {
    // Stop existing stream if any
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }

    // Request camera access with specific constraints for external webcam
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    elements.cameraPreview.srcObject = mediaStream;
    elements.cameraError.style.display = 'none';
    elements.cameraOverlay.style.display = 'flex';

    return true;
  } catch (error) {
    console.error('Camera initialization error:', error);
    elements.cameraError.style.display = 'flex';
    elements.cameraOverlay.style.display = 'none';
    return false;
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (elements.cameraPreview) {
    elements.cameraPreview.srcObject = null;
  }
}

function capturePhoto() {
  const canvas = elements.photoCanvas;
  const video = elements.cameraPreview;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Get base64 image (JPEG for smaller size)
  const photoData = canvas.toDataURL('image/jpeg', 0.8);

  return photoData;
}

// ==================== BARCODE HANDLING ====================
let barcodeBuffer = '';
let barcodeTimeout = null;

function initBarcodeScanner() {
  log('Initializing barcode scanner...');

  // Focus on barcode input
  if (elements.barcodeInput) {
    log('Barcode input element found');

    // Initial focus
    elements.barcodeInput.focus();
    log('Initial focus set on barcode input');

    // Re-focus when clicking anywhere on scan screen
    document.addEventListener('click', (e) => {
      if (state.current === AppState.SCANNING && elements.barcodeInput) {
        log('Click detected, refocusing barcode input');
        elements.barcodeInput.focus();
      }
    });

    // Handle barcode input - listen for any input
    elements.barcodeInput.addEventListener('input', (e) => {
      log('Input event:', e.target.value);
      handleBarcodeInput(e);
    });

    // Handle keydown for Enter key
    elements.barcodeInput.addEventListener('keydown', (e) => {
      log('Keydown:', e.key, 'Current value:', elements.barcodeInput.value);
      if (e.key === 'Enter') {
        e.preventDefault();
        log('Enter pressed, processing barcode...');
        processBarcode();
      }
    });

    // Handle paste event
    elements.barcodeInput.addEventListener('paste', (e) => {
      log('Paste event detected');
      setTimeout(() => {
        log('Paste value:', elements.barcodeInput.value);
        processBarcode();
      }, 100);
    });

    // Prevent focus loss - aggressive refocus
    elements.barcodeInput.addEventListener('blur', () => {
      log('Barcode input lost focus');
      if (state.current === AppState.SCANNING) {
        setTimeout(() => {
          log('Refocusing barcode input after blur');
          if (elements.barcodeInput) {
            elements.barcodeInput.focus();
          }
        }, 100);
      }
    });

    // Log focus events
    elements.barcodeInput.addEventListener('focus', () => {
      log('Barcode input gained focus');
    });

    log('Barcode scanner initialized successfully');
  } else {
    logError('Barcode input element NOT found!');
  }
}

function handleBarcodeInput(e) {
  clearTimeout(barcodeTimeout);

  const currentValue = elements.barcodeInput.value;
  log('Handling input, current value length:', currentValue.length);

  // Wait for complete barcode (scanners usually send data quickly)
  barcodeTimeout = setTimeout(() => {
    log('Timeout reached, processing barcode');
    processBarcode();
  }, 500); // Increased timeout for slower scanners
}

async function processBarcode() {
  const rawData = elements.barcodeInput.value.trim();
  elements.barcodeInput.value = '';

  if (!rawData) {
    log('Empty barcode data, skipping');
    return;
  }

  log('Processing barcode:', rawData);
  log('Raw data length:', rawData.length);

  try {
    // Parse JSON from barcode
    const userData = parseBarcode(rawData);

    if (!userData) {
      logError('Failed to parse barcode data');
      showScanError('Format barcode tidak valid');
      return;
    }

    log('Parsed user data:', userData);

    // Check if already attended today for this event
    // Use OriginalId for local SQLite check (unique person identification)
    const todayStr = window.utils.getJakartaDateTime();
    log('Checking attendance for date:', todayStr);

    const alreadyAttended = await window.electronAPI.checkAlreadyAbsen(
      userData.OriginalId, // Use OriginalId for local database check
      state.selectedEvent.id,
      todayStr
    );

    log('Already attended:', alreadyAttended);

    if (alreadyAttended) {
      log('User already attended, showing modal');
      showModal('modalAlreadyAttended');

      // Start countdown for auto-close
      let countdown = 3;
      const countdownEl = document.getElementById('alreadyAttendedCountdown');
      if (countdownEl) countdownEl.textContent = countdown;

      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = countdown;

        if (countdown <= 0) {
          clearInterval(countdownInterval);
          hideModal('modalAlreadyAttended');
          if (elements.barcodeInput) {
            elements.barcodeInput.focus();
          }
        }
      }, 1000);

      return;
    }

    // Store user data and proceed
    state.scannedUser = userData;
    hideScanError();
    log('Proceeding to validation...');
    goToValidation();

  } catch (error) {
    logError('Barcode processing error:', error);
    showScanError('Gagal memproses barcode, coba lagi');
  }
}

function parseBarcode(rawData) {
  log('Parsing barcode data...');

  try {
    // Try to parse as JSON
    let data;

    // Handle possible escape sequences
    if (rawData.startsWith('{')) {
      log('Data starts with {, parsing as JSON');
      data = JSON.parse(rawData);
    } else {
      // Try to find JSON in the string
      log('Searching for JSON in string...');
      const jsonMatch = rawData.match(/\{.*\}/);
      if (jsonMatch) {
        log('Found JSON match:', jsonMatch[0]);
        data = JSON.parse(jsonMatch[0]);
      } else {
        logError('No JSON found in barcode data');
        return null;
      }
    }

    log('Parsed JSON:', data);

    // Validate required fields
    if (typeof data.Id !== 'number' || !data.Nama) {
      logError('Missing required fields. Id:', data.Id, 'Nama:', data.Nama);
      return null;
    }

    // Return normalized data with safe handling of nullable fields
    // Id = 0 for server API (auto increment)
    // OriginalId = actual Id from QR for local SQLite identification
    const result = {
      Id: 0, // Force Id to always be 0 for server API
      OriginalId: data.Id, // Keep original Id for local database identification
      Nama: String(data.Nama || ''),
      TanggalLahir: data.TanggalLahir || null,
      Telepon: data.Telepon || null,
      Posisi: typeof data.Posisi === 'number' ? data.Posisi : 0
    };

    log('Normalized data:', result);
    return result;
  } catch (error) {
    logError('Parse error:', error);
    return null;
  }
}

function showScanError(message) {
  log('Showing scan error:', message);
  elements.scanErrorText.textContent = message;
  elements.scanError.style.display = 'flex';

  // Auto hide after 3 seconds
  setTimeout(() => {
    hideScanError();
  }, 3000);
}

function hideScanError() {
  elements.scanError.style.display = 'none';
}

// ==================== SWIPER (Dot & Button Navigation) ====================
function initSwiper() {
  log('Initializing swiper with dot and button navigation...');

  // Previous button
  elements.swiperPrev.addEventListener('click', () => {
    if (state.swiperIndex > 0) {
      state.swiperIndex--;
      updateSwiper();
    }
  });

  // Next button
  elements.swiperNext.addEventListener('click', () => {
    const maxIndex = Math.max(0, state.events.length - 1);
    if (state.swiperIndex < maxIndex) {
      state.swiperIndex++;
      updateSwiper();
    }
  });
}

function updateSwiper() {
  const slides = elements.eventList.querySelectorAll('.swiper-slide');
  slides.forEach((slide, index) => {
    slide.classList.toggle('active', index === state.swiperIndex);
  });
  updateSwiperButtons();
  updateSwiperDots();
}

function updateSwiperButtons() {
  const maxIndex = Math.max(0, state.events.length - 1);
  elements.swiperPrev.disabled = state.swiperIndex <= 0;
  elements.swiperNext.disabled = state.swiperIndex >= maxIndex;
}

function updateSwiperDots() {
  elements.swiperDots.innerHTML = '';

  state.events.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.className = `swiper-dot${index === state.swiperIndex ? ' active' : ''}`;
    dot.addEventListener('click', () => {
      state.swiperIndex = index;
      updateSwiper();
    });
    elements.swiperDots.appendChild(dot);
  });
}

function renderEvents() {
  // This function now delegates to filterAndRenderEvents
  filterAndRenderEvents();;
}

function selectEvent(event, index) {
  // Update selection visual
  const slides = elements.eventList.querySelectorAll('.swiper-slide');
  slides.forEach((s, i) => {
    s.classList.toggle('selected', i === index);
  });

  state.selectedEvent = event;

  // Auto navigate to scan after short delay
  setTimeout(() => {
    goToScan();
  }, 300);
}

// ==================== SCREEN NAVIGATION ====================
function showScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => s.classList.remove('active'));

  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }
}

function goToEventSelect() {
  state.current = AppState.EVENT_SELECT;
  state.selectedEvent = null;
  state.scannedUser = null;
  state.capturedPhoto = null;

  // Clear search when returning to event selection
  clearEventSearch();

  // Stop real-time attendance history refresh
  stopAttendanceHistoryRefresh();

  stopCamera();
  showScreen('screenEventSelect');
  loadEvents();
}

function goToScan() {
  if (!state.selectedEvent) return;

  state.current = AppState.SCANNING;

  elements.selectedEventName.textContent = state.selectedEvent.nama || state.selectedEvent.name || 'Acara';
  elements.selectedEventDate.textContent = window.utils.getJakartaDateTime();

  showScreen('screenScan');
  updateStats();
  loadAttendanceHistory(); // Load attendance history for selected event
  startAttendanceHistoryRefresh(); // Start real-time refresh

  // Focus barcode input
  setTimeout(() => {
    if (elements.barcodeInput) {
      elements.barcodeInput.value = '';
      elements.barcodeInput.focus();
    }
  }, 100);
}

function goToValidation() {
  state.current = AppState.VALIDATION;

  // Display user info
  elements.userName.textContent = state.scannedUser.Nama;
  elements.userPhone.textContent = state.scannedUser.Telepon
    ? `Tel: ${state.scannedUser.Telepon}`
    : '';
  elements.userBirthdate.textContent = state.scannedUser.TanggalLahir
    ? `Lahir: ${formatDate(state.scannedUser.TanggalLahir)}`
    : '';

  showScreen('screenValidation');
  startValidationTimer();
}

let validationTimerInterval = null;

function startValidationTimer() {
  const skipPhoto = elements.noPhotoCheckbox && elements.noPhotoCheckbox.checked;
  const duration = skipPhoto ? 1 : 3;
  const circumference = 2 * Math.PI * 45; // r=45
  let count = duration;

  // Configure display based on photo mode
  if (skipPhoto) {
    if (elements.timerRing) elements.timerRing.style.display = 'none';
    elements.timerCount.style.display = 'none';
    if (elements.timerLabel) elements.timerLabel.textContent = 'Tunggu Sebentar!';
  } else {
    if (elements.timerRing) elements.timerRing.style.display = '';
    elements.timerCount.style.display = '';
    elements.timerCount.textContent = count;
    if (elements.timerLabel) elements.timerLabel.textContent = 'Memverifikasi data...';
  }

  elements.timerProgress.style.strokeDasharray = circumference;
  elements.timerProgress.style.strokeDashoffset = 0;

  clearInterval(validationTimerInterval);

  validationTimerInterval = setInterval(() => {
    count--;

    if (!skipPhoto) {
      elements.timerCount.textContent = count;
      const offset = circumference * (1 - count / duration);
      elements.timerProgress.style.strokeDashoffset = offset;
    }

    if (count <= 0) {
      clearInterval(validationTimerInterval);
      goToPhotoCapture();
    }
  }, 1000);
}

async function goToPhotoCapture() {
  // Check if "Tanpa Photo" checkbox is checked
  const skipPhoto = elements.noPhotoCheckbox && elements.noPhotoCheckbox.checked;

  if (skipPhoto) {
    // Skip photo capture, no photo will be used
    state.capturedPhoto = null;
    log('Skipping photo capture - will use default SVG');
    try {
      await submitAbsensi();
      goToSuccess();
    } catch (error) {
      console.error('Submit error:', error);
      showToast('Gagal menyimpan ke server, disimpan lokal', 'error');
      goToSuccess();
    }
    return;
  }

  state.current = AppState.PHOTO_CAPTURE;

  elements.photoUserName.textContent = state.scannedUser.Nama;
  elements.photoInstruction.textContent = 'Posisikan wajah dalam bingkai';
  elements.capturedPhoto.style.display = 'none';
  elements.cameraPreview.style.display = 'block';
  elements.btnRetakePhoto.style.display = 'none';
  elements.btnConfirmPhoto.style.display = 'none';

  showScreen('screenPhoto');

  const cameraReady = await initCamera();

  if (cameraReady) {
    // Auto capture after 2 seconds
    setTimeout(() => {
      if (state.current === AppState.PHOTO_CAPTURE) {
        performCapture();
      }
    }, 2000);
  } else {
    // If camera fails, proceed without photo
    elements.photoInstruction.textContent = 'Kamera tidak tersedia, lanjutkan tanpa foto?';
    elements.btnConfirmPhoto.style.display = 'inline-flex';
  }
}

function performCapture() {
  const photoData = capturePhoto();
  state.capturedPhoto = photoData;

  // Show captured photo
  elements.capturedPhoto.src = photoData;
  elements.capturedPhoto.style.display = 'block';
  elements.cameraPreview.style.display = 'none';
  elements.cameraOverlay.style.display = 'none';

  elements.photoInstruction.textContent = 'Foto berhasil diambil';
  elements.btnRetakePhoto.style.display = 'inline-flex';
  elements.btnConfirmPhoto.style.display = 'inline-flex';

  stopCamera();
}

function retakePhoto() {
  state.capturedPhoto = null;
  elements.capturedPhoto.style.display = 'none';
  elements.cameraPreview.style.display = 'block';
  elements.btnRetakePhoto.style.display = 'none';
  elements.btnConfirmPhoto.style.display = 'none';
  elements.photoInstruction.textContent = 'Posisikan wajah dalam bingkai';

  initCamera().then(ready => {
    if (ready) {
      setTimeout(() => {
        if (state.current === AppState.PHOTO_CAPTURE && !state.capturedPhoto) {
          performCapture();
        }
      }, 2000);
    }
  });
}

async function confirmPhoto() {
  elements.btnRetakePhoto.disabled = true;
  elements.btnConfirmPhoto.disabled = true;
  elements.photoInstruction.textContent = 'Menyimpan absensi...';

  try {
    await submitAbsensi();
    goToSuccess();
  } catch (error) {
    console.error('Submit error:', error);
    showToast('Gagal menyimpan ke server, disimpan lokal', 'error');
    goToSuccess();
  } finally {
    elements.btnRetakePhoto.disabled = false;
    elements.btnConfirmPhoto.disabled = false;
  }
}

async function submitAbsensi() {
  const todayStr = window.utils.getJakartaDateString();

  // Get Jakarta timestamp (GMT+7) for all date/time fields
  const jakartaTimestamp = window.utils.getJakartaTimestamp();

  // Log timestamp for debugging
  console.log('[TIMESTAMP DEBUG]');
  console.log('System time:', new Date().toString());
  console.log('Jakarta timestamp:', jakartaTimestamp);
  console.log('Today string:', todayStr);

  // Default photo URL for attendance without photo
  const DEFAULT_PHOTO_URL = 'https://i.pinimg.com/736x/98/e8/cb/98e8cbbfafddf950128b90f129348d66.jpg';

  // Prepare photo data (remove data URL prefix)
  let photoBase64 = '';
  let photoUrl = '';

  if (state.capturedPhoto && state.capturedPhoto.startsWith('data:')) {
    // It's base64 data from camera capture
    photoBase64 = state.capturedPhoto.replace(/^data:image\/\w+;base64,/, '');

    // Upload photo to S3 first if online
    if (state.isOnline) {
      log('Uploading photo to S3...');
      try {
        const uploadResult = await window.electronAPI.uploadPhotoToS3(
          photoBase64,
          state.scannedUser.Id,
          state.selectedEvent.id
        );

        if (uploadResult.success && uploadResult.url) {
          photoUrl = uploadResult.url;
          log('Photo uploaded to S3:', photoUrl);
        } else {
          log('S3 upload failed:', uploadResult.error);
          // Continue with base64 as fallback
        }
      } catch (uploadError) {
        logError('S3 upload error:', uploadError);
        // Continue with base64 as fallback
      }
    }
  } else {
    // No photo captured - use default photo URL
    photoUrl = DEFAULT_PHOTO_URL;
    log('No photo captured, using default photo URL:', photoUrl);
  }

  // For local SQLite: use OriginalId for unique person identification
  // For server API: use Id (which is 0, server will auto increment)
  const absensiData = {
    personId: state.scannedUser.OriginalId, // Use OriginalId for local database
    acaraId: state.selectedEvent.id,
    nama: state.scannedUser.Nama,
    tanggalLahir: state.scannedUser.TanggalLahir,
    telepon: state.scannedUser.Telepon,
    posisi: state.scannedUser.Posisi,
    photoData: photoUrl ? '' : photoBase64, // Only store base64 if S3 upload failed
    photoUrl: photoUrl, // Store S3 URL
    tanggal: todayStr,
    tanggalAbsen: jakartaTimestamp,
    jamaahId: state.scannedUser.OriginalId, // Map QR Id → jamaahId
    synced: false
  };

  // Try to submit to API first
  let synced = false;

  if (state.isOnline) {
    try {
      // Use different API endpoint based on whether we have S3 URL or not
      // For server API: use Id (which is 0, server will auto increment)
      if (photoUrl) {
        // Photo already uploaded to S3, use URL endpoint
        log('Submitting absensi with S3 URL...');
        await apiService.inputAbsenWithImageUrl({
          acaraId: state.selectedEvent.id,
          nama: state.scannedUser.Nama,
          posisi: state.scannedUser.Posisi,
          tanggal: jakartaTimestamp,
          photoUrl: photoUrl,
          jamaahId: state.scannedUser.OriginalId // Map QR Id → jamaahId
        });
      } else {
        // No S3 URL, fallback to base64 upload
        log('Submitting absensi with base64 data...');
        await apiService.inputAbsenWithImageBytes({
          acaraId: state.selectedEvent.id,
          nama: state.scannedUser.Nama,
          posisi: state.scannedUser.Posisi,
          tanggal: jakartaTimestamp,
          photoData: photoBase64,
          jamaahId: state.scannedUser.OriginalId // Map QR Id → jamaahId
        });
      }
      synced = true;
      showToast('Absensi berhasil disimpan', 'success');
    } catch (error) {
      console.error('API submit error:', error);
      synced = false;
    }
  }

  // Always save to local database (with OriginalId as personId)
  absensiData.synced = synced;
  await window.electronAPI.saveAbsensi(absensiData);

  if (!synced) {
    showToast('Disimpan offline, akan disinkronkan nanti', 'info');
  }
}

let successTimerInterval = null;

function goToSuccess() {
  state.current = AppState.SUCCESS;

  // Add to attendance history panel
  addToAttendanceHistory(state.scannedUser);

  // Display success info with fallback SVG support
  if (state.capturedPhoto && !state.capturedPhoto.includes('DEFAULT_SVG')) {
    elements.successPhoto.src = state.capturedPhoto;
    elements.successPhoto.style.display = 'block';
    elements.successAvatarFallback.style.display = 'none';
    // Add error handler for fallback - show SVG on error
    elements.successPhoto.onerror = function() {
      this.onerror = null;
      this.style.display = 'none';
      elements.successAvatarFallback.style.display = 'flex';
    };
  } else {
    // Use default SVG when no photo
    elements.successPhoto.style.display = 'none';
    elements.successAvatarFallback.style.display = 'flex';
  }

  elements.successName.textContent = state.scannedUser.Nama;
  elements.successEvent.textContent = state.selectedEvent.nama || state.selectedEvent.name || 'Acara';
  elements.successTime.textContent = new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit'
  });

  showScreen('screenSuccess');

  // Auto return countdown — 1.5s if no photo, 3s if with photo
  const skipPhoto = elements.noPhotoCheckbox && elements.noPhotoCheckbox.checked;
  const countdownDuration = skipPhoto ? 2 : 3;
  const countdownInterval = skipPhoto ? 750 : 1000;
  let count = countdownDuration;
  elements.successCountdown.textContent = count;

  clearInterval(successTimerInterval);
  successTimerInterval = setInterval(() => {
    count--;
    elements.successCountdown.textContent = count;

    if (count <= 0) {
      clearInterval(successTimerInterval);
      returnToScan();
    }
  }, countdownInterval);
}

function returnToScan() {
  state.scannedUser = null;
  state.capturedPhoto = null;
  goToScan();
}

// ==================== EVENT LOADING ====================
async function loadEvents() {
  elements.loadingEvents.style.display = 'flex';
  elements.noEventMessage.style.display = 'none';
  elements.todayEventsSection.style.display = 'none';
  elements.otherEventsSection.style.display = 'none';
  elements.noSearchResults.style.display = 'none';

  try {
    // Fetch from API /api/Absensi/GetAcara
    let allEvents = [];

    try {
      log('Fetching events from API...');
      const apiData = await apiService.getAcara();

      // Map API response to use only id, nama, tanggalDari
      allEvents = (apiData || []).map(event => ({
        id: event.id,
        nama: (event.nama || '').trim(), // Remove trailing tabs/spaces
        tanggalDari: event.tanggalDari,
        keterangan: event.keterangan || ''
      }));

      log('Fetched events from API:', allEvents.length);
    } catch (apiError) {
      logError('API fetch error:', apiError.message);
      allEvents = [];
    }

    // Store all events
    state.allEvents = allEvents;

    // Group events by today and other days
    const todayStr = window.utils.getJakartaDateTime(); // Format: YYYY-MM-DD
    log('Today date:', todayStr);

    state.todayEvents = [];
    state.otherEvents = [];

    allEvents.forEach(event => {
      if (!event.tanggalDari) {
        // No date, put in other events
        state.otherEvents.push(event);
        return;
      }

      // Extract date part (YYYY-MM-DD) from tanggalDari
      const eventDate = event.tanggalDari.split('T')[0];

      if (eventDate === todayStr) {
        state.todayEvents.push(event);
      } else {
        state.otherEvents.push(event);
      }
    });

    state.events = state.todayEvents;

    log('Today events:', state.todayEvents.length);
    log('Other events:', state.otherEvents.length);

    // Apply search filter if any
    filterAndRenderEvents();

  } catch (error) {
    console.error('Error loading events:', error);
    state.allEvents = [];
    state.todayEvents = [];
    state.otherEvents = [];
    filterAndRenderEvents();
  } finally {
    elements.loadingEvents.style.display = 'none';
  }
}

function filterAndRenderEvents() {
  const query = state.searchQuery.toLowerCase().trim();

  let filteredTodayEvents = state.todayEvents;
  let filteredOtherEvents = state.otherEvents;

  if (query) {
    filteredTodayEvents = state.todayEvents.filter(event => {
      const name = (event.nama || '').toLowerCase();
      const desc = (event.keterangan || '').toLowerCase();
      return name.includes(query) || desc.includes(query);
    });

    filteredOtherEvents = state.otherEvents.filter(event => {
      const name = (event.nama || '').toLowerCase();
      const desc = (event.keterangan || '').toLowerCase();
      return name.includes(query) || desc.includes(query);
    });
  }

  // Hide all sections first
  elements.noEventMessage.style.display = 'none';
  elements.todayEventsSection.style.display = 'none';
  elements.otherEventsSection.style.display = 'none';
  elements.noSearchResults.style.display = 'none';

  const hasAnyResults = filteredTodayEvents.length > 0 || filteredOtherEvents.length > 0;

  if (!hasAnyResults) {
    if (query) {
      // No search results
      elements.noSearchResults.style.display = 'flex';
    } else {
      // No events at all
      elements.noEventMessage.style.display = 'flex';
    }
    return;
  }

  // Render today's events
  if (filteredTodayEvents.length > 0) {
    state.events = filteredTodayEvents;
    state.swiperIndex = 0;
    renderTodayEvents(filteredTodayEvents);
    elements.todayEventsSection.style.display = 'flex';
  }

  // Render other events
  if (filteredOtherEvents.length > 0) {
    renderOtherEvents(filteredOtherEvents);
    elements.otherEventsSection.style.display = 'block';
  }
}

function renderTodayEvents(events) {
  elements.eventList.innerHTML = '';
  elements.eventSwiper.style.display = 'flex';

  events.forEach((event, index) => {
    const slide = document.createElement('div');
    // Tambah class 'active' untuk slide pertama (sesuai swiperIndex)
    slide.className = `swiper-slide today-event${index === state.swiperIndex ? ' active' : ''}`;
    slide.innerHTML = `
      <h3 class="event-card-title">${escapeHtml(event.nama || 'Acara')}</h3>
      <p class="event-card-desc">${escapeHtml(event.keterangan || '')}</p>
      <div class="event-card-meta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>${formatEventDateFromTanggalDari(event.tanggalDari)}</span>
      </div>
    `;

    slide.addEventListener('click', () => selectEvent(event, index));
    elements.eventList.appendChild(slide);
  });

  updateSwiperDots();
}

function renderOtherEvents(events) {
  elements.otherEventsList.innerHTML = '';

  // Sort by date (nearest first)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.tanggalDari || 0);
    const dateB = new Date(b.tanggalDari || 0);
    return dateA - dateB;
  });

  sortedEvents.forEach((event, index) => {
    const card = document.createElement('div');
    card.className = 'other-event-card';
    card.style.animationDelay = `${index * 0.05}s`;

    const eventDate = formatEventDateFromTanggalDari(event.tanggalDari);

    card.innerHTML = `
      <h4 class="event-card-title">${escapeHtml(event.nama || 'Acara')}</h4>
      <p class="event-card-desc">${escapeHtml(event.keterangan || '')}</p>
      <div class="event-card-date">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>${eventDate}</span>
      </div>
    `;

    card.addEventListener('click', () => selectOtherEvent(event));
    elements.otherEventsList.appendChild(card);
  });
}

function formatEventDateFromTanggalDari(tanggalDari) {
  if (!tanggalDari) return '';

  try {
    const date = new Date(tanggalDari);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

function selectOtherEvent(event) {
  state.selectedEvent = event;

  // Show confirmation or directly go to scan
  setTimeout(() => {
    goToScan();
  }, 200);
}

// Search functionality
function handleEventSearch(query) {
  state.searchQuery = query;

  // Show/hide clear button
  if (elements.btnClearSearch) {
    elements.btnClearSearch.style.display = query ? 'flex' : 'none';
  }

  // Filter and re-render with debounce
  clearTimeout(state.searchTimeout);
  state.searchTimeout = setTimeout(() => {
    filterAndRenderEvents();
  }, 200);
}

function clearEventSearch() {
  state.searchQuery = '';
  if (elements.eventSearchInput) {
    elements.eventSearchInput.value = '';
  }
  if (elements.btnClearSearch) {
    elements.btnClearSearch.style.display = 'none';
  }
  filterAndRenderEvents();
}

async function fetchActiveEvents() {
  try {
    // Try fetching from API
    const response = await apiService.getAllAcara();
    return response || [];
  } catch (error) {
    console.error('Fetch events error:', error);
    return [];
  }
}

// ==================== SYNC MANAGEMENT ====================
async function openSyncModal() {
  showModal('modalSync');
  await loadSyncData();
}

async function loadSyncData() {
  try {
    const allData = await window.electronAPI.getAllAbsensi();
    const unsyncedData = await window.electronAPI.getUnsyncedAbsensi();

    elements.syncTotal.textContent = allData.length;
    elements.syncPending.textContent = unsyncedData.length;
    elements.syncSuccess.textContent = allData.length - unsyncedData.length;

    // Render unsynced list
    elements.unsyncedList.innerHTML = '';
    unsyncedData.forEach(item => {
      const div = document.createElement('div');
      div.className = 'unsynced-item';
      div.innerHTML = `
        <div>
          <div class="unsynced-name">${escapeHtml(item.nama)}</div>
          <div class="unsynced-date">${item.tanggal} - ${item.tanggal_absen}</div>
        </div>
      `;
      elements.unsyncedList.appendChild(div);
    });

  } catch (error) {
    console.error('Load sync data error:', error);
  }
}

async function startSync() {
  if (!state.isOnline) {
    showToast('Tidak ada koneksi internet', 'error');
    return;
  }

  elements.syncProgress.style.display = 'block';
  elements.btnStartSync.disabled = true;

  try {
    const unsyncedData = await window.electronAPI.getUnsyncedAbsensi();
    const total = unsyncedData.length;
    let synced = 0;
    let failed = 0;

    for (const item of unsyncedData) {
      try {
        // Upload photo to S3 first if not already uploaded
        let photoUrl = item.photo_url || '';

        if (!photoUrl && item.photo_data) {
          log('Uploading photo to S3 during sync...');
          try {
            const uploadResult = await window.electronAPI.uploadPhotoToS3(
              item.photo_data,
              item.person_id,
              item.acara_id
            );
            if (uploadResult.success && uploadResult.url) {
              photoUrl = uploadResult.url;
              log('Photo uploaded to S3:', photoUrl);
            }
          } catch (uploadError) {
            logError('S3 upload during sync error:', uploadError);
          }
        }

        // Use different API endpoint based on whether we have S3 URL or not
        if (photoUrl) {
          // Photo already uploaded to S3, use URL endpoint
          await apiService.inputAbsenWithImageUrl({
            acaraId: item.acara_id,
            nama: item.nama,
            posisi: item.posisi,
            tanggal: new Date(item.tanggal_absen).toISOString(),
            photoUrl: photoUrl,
            jamaahId: item.jamaah_id || item.person_id // Map to jamaahId
          });
        } else {
          // No S3 URL, fallback to base64 upload
          await apiService.inputAbsenWithImageBytes({
            acaraId: item.acara_id,
            nama: item.nama,
            posisi: item.posisi,
            tanggal: new Date(item.tanggal_absen).toISOString(),
            photoData: item.photo_data || '',
            jamaahId: item.jamaah_id || item.person_id // Map to jamaahId
          });
        }

        await window.electronAPI.markAsSynced(item.id);
        synced++;
      } catch (error) {
        console.error('Sync item error:', error);
        failed++;
      }

      const progress = ((synced + failed) / total) * 100;
      elements.syncProgressBar.style.width = `${progress}%`;
      elements.syncProgressText.textContent = `Menyinkronkan ${synced + failed}/${total}...`;
    }

    elements.syncProgressText.textContent = `Selesai: ${synced} berhasil, ${failed} gagal`;
    showToast(`Sinkronisasi selesai: ${synced} berhasil`, synced > 0 ? 'success' : 'info');

    await loadSyncData();

  } catch (error) {
    console.error('Sync error:', error);
    showToast('Gagal melakukan sinkronisasi', 'error');
  } finally {
    elements.btnStartSync.disabled = false;
  }
}

// Clear all local absensi data
async function clearLocalData() {
  elements.btnConfirmDelete.disabled = true;
  elements.btnCancelDelete.disabled = true;

  try {
    log('Clearing all local absensi data...');
    const result = await window.electronAPI.clearAllAbsensi();

    if (result.success) {
      showToast('Data lokal berhasil dihapus', 'success');
      log('Local data cleared successfully');
    } else {
      showToast('Gagal menghapus data lokal', 'error');
    }

    // Refresh sync data display
    await loadSyncData();

    // Hide confirmation modal
    hideModal('modalConfirmDelete');

  } catch (error) {
    console.error('Clear local data error:', error);
    showToast('Gagal menghapus data lokal', 'error');
  } finally {
    elements.btnConfirmDelete.disabled = false;
    elements.btnCancelDelete.disabled = false;
  }
}

// ==================== STATS UPDATE ====================
async function updateStats() {
  try {
    const todayStr = window.utils.getJakartaDateTime();
    const allData = await window.electronAPI.getAllAbsensi();
    const unsyncedData = await window.electronAPI.getUnsyncedAbsensi();

    // Count today's attendance for selected event
    const todayCount = allData.filter(item =>
      item.tanggal === todayStr &&
      item.acara_id === state.selectedEvent?.id
    ).length;

    elements.todayCount.textContent = todayCount;
    elements.unsyncedCount.textContent = unsyncedData.length;
  } catch (error) {
    console.error('Update stats error:', error);
  }
}

// ==================== ATTENDANCE HISTORY ====================
let attendanceHistoryInterval = null;
const ATTENDANCE_REFRESH_INTERVAL = 10000; // 10 seconds for real-time updates

async function loadAttendanceHistory(showLoading = true) {
  if (!state.selectedEvent) return;

  log('Loading attendance history for event:', state.selectedEvent.id);

  // Show loading state only on initial load
  if (showLoading) {
    elements.historyLoading.style.display = 'flex';
    elements.historyEmpty.style.display = 'none';
    elements.historyList.innerHTML = '';
  }

  try {
    // Get today's date in YYYY-MM-DD format for API
    const todayStr = window.utils.getJakartaDateTime(); // Format: YYYY-MM-DD

    let historyData = [];

    // Fetch directly from API endpoint
    // GET /api/Absensi/GetAbsensiByAcaraId?RefId={id}&Tanggal={YYYY-MM-DD}&ApiKey={key}
    try {
      log('Fetching from API with RefId:', state.selectedEvent.id, 'Tanggal:', todayStr);
      const apiData = await apiService.getAbsensiByAcaraId(
        state.selectedEvent.id,
        todayStr
      );
      log('API attendance data:', apiData);
      historyData = apiData || [];
    } catch (apiError) {
      logError('API fetch error:', apiError.message);
      // API failed, show error but continue
      historyData = [];
    }

    // Update history count
    elements.historyCount.textContent = historyData.length;

    // Hide loading
    elements.historyLoading.style.display = 'none';

    // Show appropriate state
    if (historyData.length === 0) {
      elements.historyEmpty.style.display = 'flex';
    } else {
      elements.historyEmpty.style.display = 'none';
      renderAttendanceHistory(historyData);
    }

  } catch (error) {
    console.error('Load attendance history error:', error);
    elements.historyLoading.style.display = 'none';
    elements.historyEmpty.style.display = 'flex';
  }
}

// Start real-time attendance history refresh
function startAttendanceHistoryRefresh() {
  // Clear any existing interval
  stopAttendanceHistoryRefresh();

  log('Starting real-time attendance history refresh (every', ATTENDANCE_REFRESH_INTERVAL / 1000, 'seconds)');

  // Set up periodic refresh for real-time updates
  attendanceHistoryInterval = setInterval(() => {
    if (state.current === AppState.SCANNING && state.selectedEvent) {
      log('Auto-refreshing attendance history...');
      loadAttendanceHistory(false); // Don't show loading spinner on auto-refresh
    }
  }, ATTENDANCE_REFRESH_INTERVAL);
}

// Stop real-time attendance history refresh
function stopAttendanceHistoryRefresh() {
  if (attendanceHistoryInterval) {
    clearInterval(attendanceHistoryInterval);
    attendanceHistoryInterval = null;
    log('Stopped attendance history refresh');
  }
}

function renderAttendanceHistory(data) {
  elements.historyList.innerHTML = '';

  log('Rendering attendance history, data count:', data.length);

  // Sort by time (oldest first - chronological order)
  // API response format: { id, tanggal, nama, photoUrl, refId, jumlahOrang, tipe }
  const sortedData = [...data].sort((a, b) => {
    const timeA = new Date(a.tanggal || 0);
    const timeB = new Date(b.tanggal || 0);
    return timeA - timeB; // Ascending: oldest first
  });

  sortedData.forEach((item, index) => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';

    // Get name from API response
    const nama = item.nama || 'Unknown';

    // Get time from tanggal field (ISO format: "2026-01-07T08:16:37.98")
    const timeStr = item.tanggal;
    let formattedTime = '';
    if (timeStr) {
      try {
        formattedTime = formatTimestampToJakarta(timeStr);
      } catch (e) {
        formattedTime = '';
      }
    }

    // Get photo URL directly from API response photoUrl field
    // Example: "https://is3.cloudhost.id/portalub/absensi/2026-01-07/209_10_1767773798004.jpg"
    const photoUrl = item.photoUrl || '';
    const hasPhoto = photoUrl && photoUrl.length > 0;

    log('History item:', nama, 'photoUrl:', photoUrl, 'hasPhoto:', hasPhoto);

    historyItem.innerHTML = `
      <div class="history-number">${index + 1}</div>
      <div class="history-avatar">
        ${hasPhoto
          ? `<img src="${photoUrl}" alt="${escapeHtml(nama)}" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
             <div class="avatar-fallback" style="display:none;">${DEFAULT_USER_SVG}</div>`
          : DEFAULT_USER_SVG
        }
      </div>
      <div class="history-info">
        <p class="history-name">${escapeHtml(nama)}</p>
        <p class="history-time">${formattedTime}</p>
      </div>
    `;

    elements.historyList.appendChild(historyItem);
  });
}

// Add new attendance to history (called after successful attendance)
function addToAttendanceHistory(userData) {
  if (!elements.historyList) return;

  const historyItem = document.createElement('div');
  historyItem.className = 'history-item history-item-new';

  const currentTime = new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Get current count and increment
  const currentCount = parseInt(elements.historyCount.textContent) || 0;
  const newCount = currentCount + 1;
  elements.historyCount.textContent = newCount;

  // Hide empty message if showing
  elements.historyEmpty.style.display = 'none';

  // Default photo URL for attendance without photo
  const DEFAULT_PHOTO_URL = 'https://i.pinimg.com/736x/98/e8/cb/98e8cbbfafddf950128b90f129348d66.jpg';

  // Determine photo source
  const hasCustomPhoto = state.capturedPhoto && !state.capturedPhoto.includes('DEFAULT_SVG');
  const photoSrc = hasCustomPhoto ? state.capturedPhoto : DEFAULT_PHOTO_URL;

  historyItem.innerHTML = `
    <div class="history-number">${newCount}</div>
    <div class="history-avatar">
      <img src="${photoSrc}" alt="${escapeHtml(userData.Nama)}" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';">
      <div class="avatar-fallback" style="display:none;">${DEFAULT_USER_SVG}</div>
    </div>
    <div class="history-info">
      <p class="history-name">${escapeHtml(userData.Nama)}</p>
      <p class="history-time">${currentTime}</p>
    </div>
  `;

  // Append at the end (chronological order - newest at bottom with highest number)
  elements.historyList.appendChild(historyItem);

  // Remove new class after animation
  setTimeout(() => {
    historyItem.classList.remove('history-item-new');
  }, 500);
}

// ==================== CONNECTION CHECK ====================
async function checkConnection() {
  try {
    const online = await apiService.checkConnection();
    state.isOnline = online;

    elements.connectionStatus.textContent = online ? 'Online' : 'Offline';
    elements.connectionStatus.className = `status-badge ${online ? 'status-online' : 'status-offline'}`;
  } catch (error) {
    state.isOnline = false;
    elements.connectionStatus.textContent = 'Offline';
    elements.connectionStatus.className = 'status-badge status-offline';
  }
}

// ==================== MODAL MANAGEMENT ====================
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format timestamp to Jakarta timezone time (HH:MM)
 * Simple: just parse the date and display in Jakarta timezone
 */
function formatTimestampToJakarta(timeStr) {
  if (!timeStr) return '';

  try {
    // Simple approach: parse the date and convert to Jakarta time
    const date = new Date(timeStr);

    if (isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('formatTimestampToJakarta error:', e, timeStr);
    return '';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function formatEventDate(event) {
  try {
    const start = new Date(event.tanggalMulai || event.startDate);
    return start.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    });
  } catch {
    return '';
  }
}

function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const dateStr = now.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  elements.currentTime.textContent = `${dateStr} • ${timeStr}`;
}

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

// Default fallback SVG for users without photo (inline SVG)
const DEFAULT_USER_SVG = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>`;

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
