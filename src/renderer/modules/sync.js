/**
 * Sync Management
 * Handles data synchronization with server and local data management
 */

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
            posisi: 0,
            tanggal: new Date(item.tanggal_absen).toISOString(),
            photoUrl: photoUrl,
            jamaahId: item.jamaah_id || item.person_id // Map to jamaahId
          });
        } else {
          // No S3 URL, fallback to base64 upload
          await apiService.inputAbsenWithImageBytes({
            acaraId: item.acara_id,
            nama: item.nama,
            posisi: 0,
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
