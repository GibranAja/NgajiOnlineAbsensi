/**
 * Screen Navigation & Attendance Flow
 * Handles screen transitions, validation timer, photo capture flow, and absensi submission
 */

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

// ==================== VALIDATION TIMER ====================
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

// ==================== PHOTO CAPTURE FLOW ====================
async function goToPhotoCapture() {
  // Check if "Tanpa Photo" checkbox is checked
  const skipPhoto = elements.noPhotoCheckbox && elements.noPhotoCheckbox.checked;

  if (skipPhoto) {
    // Skip photo capture, no photo will be used
    state.capturedPhoto = null;
    log('Skipping photo capture - will use default SVG');
    try {
      await submitAbsensi();
    } catch (error) {
      console.error('Submit error:', error);
      showToast('Gagal menyimpan ke server, disimpan lokal', 'error');
    }
    returnToScan();
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

// ==================== ABSENSI SUBMISSION ====================
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
    posisi: 0,
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
          posisi: 0,
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
          posisi: 0,
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

// ==================== SUCCESS SCREEN ====================
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
