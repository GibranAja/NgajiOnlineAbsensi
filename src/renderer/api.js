/**
 * API Service - HTTP Client for Cimanggu API
 * Handles all API communication with offline fallback
 */

const API_BASE_URL = 'https://cimanggu.my.id/api';
const API_KEY = '123qweasd';

/**
 * API Service Class
 */
class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.apiKey = API_KEY;
    this.timeout = 15000; // 15 second timeout
  }

  /**
   * Make HTTP request with timeout and error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} - Response data
   */
  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = new URL(endpoint, this.baseUrl);

      // Add API key to query params if GET request
      if (!options.method || options.method === 'GET') {
        url.searchParams.append('ApiKey', this.apiKey);
      }

      const response = await fetch(url.toString(), {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server tidak merespons');
      }

      throw error;
    }
  }

  /**
   * Get active events (acara)
   * @returns {Promise<Array>} - List of active events
   */
  async getActiveAcara() {
    try {
      // Note: Adjust endpoint based on actual API structure
      const response = await this.request('/Acara/GetActiveAcara');
      return response || [];
    } catch (error) {
      console.error('Error fetching acara:', error);
      throw error;
    }
  }

  /**
   * Get all acara from /api/Absensi/GetAcara
   * @returns {Promise<Array>} - List of all events
   */
  async getAcara() {
    try {
      const url = new URL(`${this.baseUrl}/Absensi/GetAcara`);
      url.searchParams.append('ApiKey', this.apiKey);

      console.log('[API] Fetching acara from:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : [];
      console.log('[API] Acara response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching acara:', error);
      throw error;
    }
  }

  /**
   * Get all acara (legacy method)
   * @returns {Promise<Array>} - List of all events
   */
  async getAllAcara() {
    try {
      const response = await this.request('/Acara/GetAll');
      return response || [];
    } catch (error) {
      console.error('Error fetching all acara:', error);
      throw error;
    }
  }

  /**
   * Get absensi by acara ID and date
   * @param {number} refId - Acara/Event ID
   * @param {string} tanggal - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} - List of attendance records
   */
  async getAbsensiByAcaraId(refId, tanggal) {
    try {
      const url = new URL(`${this.baseUrl}/Absensi/GetAbsensiByAcaraId`);
      url.searchParams.append('RefId', refId);
      url.searchParams.append('Tanggal', tanggal);
      url.searchParams.append('ApiKey', this.apiKey);

      console.log('[API] Fetching absensi from:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : [];
      console.log('[API] Absensi response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching absensi:', error);
      throw error;
    }
  }

  /**
   * Submit absensi with image bytes (Base64)
   * @param {Object} data - Absensi data with photo
   * @returns {Promise<Object>} - API response
   */
  async inputAbsenWithImageBytes(data) {
    try {
      const payload = {
        id: 0,
        tanggal: data.tanggal,
        nama: data.nama,
        photoUrl: '',
        refId: data.acaraId,
        jumlahOrang: 1,
        tipe: 0,
        jamaahId: data.jamaahId || 0,
        photoData: data.photoData || ''
      };

      console.log('[API] Sending absensi with ImageBytes:', {
        ...payload,
        photoData: payload.photoData ? '(base64 data)' : '(empty)'
      });

      const response = await fetch(`${this.baseUrl}/Absensi/InputAbsenWithImageBytes?ApiKey=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : { success: true };
    } catch (error) {
      console.error('Error submitting absensi:', error);
      throw error;
    }
  }

  /**
   * Submit absensi with image URL
   * @param {Object} data - Absensi data with photo URL
   * @returns {Promise<Object>} - API response
   */
  async inputAbsenWithImageUrl(data) {
    try {
      const payload = {
        id: 0,
        tanggal: data.tanggal,
        nama: data.nama,
        photoUrl: data.photoUrl || '',
        refId: data.acaraId,
        jumlahOrang: 1,
        tipe: 0,
        jamaahId: data.jamaahId || 0
      };

      console.log('[API] Sending absensi with ImageUrl:', payload);

      const response = await fetch(`${this.baseUrl}/Absensi/InputAbsenWithImageUrl?ApiKey=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : { success: true };
    } catch (error) {
      console.error('Error submitting absensi URL:', error);
      throw error;
    }
  }

  /**
   * Check if online
   * @returns {Promise<boolean>} - Online status
   */
  async checkConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/Absensi/InputAbsenWithImageBytes?ApiKey=${this.apiKey}`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 405; // 405 means endpoint exists but wrong method
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
const apiService = new ApiService();
