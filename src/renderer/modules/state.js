/**
 * State Management & Debug Logging
 * Shared application state, constants, and logging utilities
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
