/**
 * UI Utilities
 * Modals, toasts, formatters, clock, and shared UI constants
 */

// Default fallback SVG for users without photo (inline SVG)
const DEFAULT_USER_SVG = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>`;

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
 */
function formatTimestampToJakarta(timeStr) {
  if (!timeStr) return '';

  try {
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
