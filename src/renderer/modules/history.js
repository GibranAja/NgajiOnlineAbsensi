/**
 * Attendance History
 * Real-time attendance history loading, rendering, and refresh
 */

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
