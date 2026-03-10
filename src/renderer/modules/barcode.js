/**
 * Barcode Scanner
 * Handles barcode input, parsing, and attendance validation
 */

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

    // If "Tanpa Photo" mode, skip validation & success screens
    const skipPhoto = elements.noPhotoCheckbox && elements.noPhotoCheckbox.checked;
    if (skipPhoto) {
      try {
        await submitAbsensi();
      } catch (error) {
        console.error('Submit error:', error);
        showToast('Gagal menyimpan absensi', 'error');
      }
      returnToScan();
      return;
    }

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
