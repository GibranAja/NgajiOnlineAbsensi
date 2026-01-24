/**
 * Database Layer - SQLite Local File
 * Uses sql.js (pure JavaScript SQLite implementation)
 * Database file stored in userData folder (writable location)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class AbsensiDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.SQL = null;
  }

  /**
   * Initialize database connection and create tables
   */
  async init() {
    try {
      // Initialize SQL.js
      console.log('[DB] Initializing SQLite...');
      this.SQL = await initSqlJs();

      // Database file path - use userData folder (writable location)
      // This ensures database works even when app is packaged as asar
      const userDataPath = app.getPath('userData');
      const dbFolder = path.join(userDataPath, 'database');
      this.dbPath = path.join(dbFolder, 'database.db');

      console.log('[DB] Database path:', this.dbPath);

      // Create database folder if not exists
      if (!fs.existsSync(dbFolder)) {
        fs.mkdirSync(dbFolder, { recursive: true });
        console.log('[DB] Created database folder');
      }

      // Load existing database or create new
      if (fs.existsSync(this.dbPath)) {
        console.log('[DB] Loading existing database...');
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(fileBuffer);
      } else {
        console.log('[DB] Creating new database...');
        this.db = new this.SQL.Database();
      }

      // Create tables
      this.createTables();

      // Save initial database
      this.save();

      console.log('[DB] Database initialized successfully');
      return true;
    } catch (error) {
      console.error('[DB] Initialization error:', error.message);
      throw error;
    }
  }

  /**
   * Save database to file
   */
  save() {
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      console.log('[DB] Database saved to file');
    } catch (error) {
      console.error('[DB] Save error:', error.message);
    }
  }

  /**
   * Create necessary tables
   */
  createTables() {
    // Absensi table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS absensi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        acara_id INTEGER NOT NULL,
        nama TEXT NOT NULL,
        tanggal_lahir TEXT,
        telepon TEXT,
        posisi INTEGER,
        photo_data TEXT,
        photo_url TEXT,
        tanggal TEXT NOT NULL,
        tanggal_absen TEXT DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0,
        sync_error TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add photo_url column if it doesn't exist (for existing databases)
    try {
      this.db.run(`ALTER TABLE absensi ADD COLUMN photo_url TEXT`);
      console.log('[DB] Added photo_url column');
    } catch (e) {
      // Column already exists, ignore
    }

    // Create indexes
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_absensi_lookup
      ON absensi(person_id, acara_id, tanggal)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_absensi_synced
      ON absensi(synced)
    `);

    // Acara cache table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS acara_cache (
        id INTEGER PRIMARY KEY,
        nama TEXT,
        deskripsi TEXT,
        tanggal_mulai TEXT,
        tanggal_selesai TEXT,
        cached_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[DB] Tables created/verified');
  }

  /**
   * Save absensi record
   */
  saveAbsensi(data) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO absensi (person_id, acara_id, nama, tanggal_lahir, telepon, posisi, photo_data, photo_url, tanggal, tanggal_absen, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        data.personId,
        data.acaraId,
        data.nama,
        data.tanggalLahir || null,
        data.telepon || null,
        data.posisi || null,
        data.photoData || null,
        data.photoUrl || null,
        data.tanggal,
        data.tanggalAbsen || new Date().toISOString(),
        data.synced ? 1 : 0
      ]);

      stmt.free();

      // Get last insert ID
      const result = this.db.exec('SELECT last_insert_rowid() as id');
      const id = result[0]?.values[0]?.[0] || 0;

      // Save to file
      this.save();

      console.log('[DB] Saved absensi ID:', id);
      return { id, ...data };
    } catch (error) {
      console.error('[DB] Save absensi error:', error.message);
      throw error;
    }
  }

  /**
   * Check if person already attended event on specific date
   */
  checkAlreadyAbsen(personId, acaraId, tanggal) {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM absensi
        WHERE person_id = ? AND acara_id = ? AND tanggal = ?
      `);

      stmt.bind([personId, acaraId, tanggal]);
      stmt.step();
      const result = stmt.getAsObject();
      stmt.free();

      const exists = result.count > 0;
      console.log('[DB] Check already absen:', { personId, acaraId, tanggal, exists });
      return exists;
    } catch (error) {
      console.error('[DB] Check absen error:', error.message);
      throw error;
    }
  }

  /**
   * Get all unsynced absensi records
   */
  getUnsyncedAbsensi() {
    try {
      const result = this.db.exec(`
        SELECT * FROM absensi WHERE synced = 0 ORDER BY created_at ASC
      `);

      const rows = this.resultToArray(result);
      console.log('[DB] Unsynced count:', rows.length);
      return rows;
    } catch (error) {
      console.error('[DB] Get unsynced error:', error.message);
      throw error;
    }
  }

  /**
   * Mark absensi as synced
   */
  markAsSynced(id) {
    try {
      this.db.run(`UPDATE absensi SET synced = 1, sync_error = NULL WHERE id = ?`, [id]);
      this.save();
      console.log('[DB] Marked synced ID:', id);
      return true;
    } catch (error) {
      console.error('[DB] Mark synced error:', error.message);
      throw error;
    }
  }

  /**
   * Mark absensi sync failed with error
   */
  markSyncError(id, errorMsg) {
    try {
      this.db.run(`UPDATE absensi SET sync_error = ? WHERE id = ?`, [errorMsg, id]);
      this.save();
    } catch (error) {
      console.error('[DB] Mark sync error failed:', error.message);
    }
  }

  /**
   * Get all absensi records
   */
  getAllAbsensi() {
    try {
      const result = this.db.exec(`SELECT * FROM absensi ORDER BY created_at DESC`);
      return this.resultToArray(result);
    } catch (error) {
      console.error('[DB] Get all error:', error.message);
      throw error;
    }
  }

  /**
   * Delete absensi record
   */
  deleteAbsensi(id) {
    try {
      this.db.run(`DELETE FROM absensi WHERE id = ?`, [id]);
      this.save();
      return true;
    } catch (error) {
      console.error('[DB] Delete error:', error.message);
      throw error;
    }
  }

  /**
   * Clear all absensi records from local database
   * Does NOT affect the main server database
   */
  clearAllAbsensi() {
    try {
      this.db.run(`DELETE FROM absensi`);
      this.save();
      console.log('[DB] All local absensi data cleared');
      return { success: true, message: 'Semua data lokal berhasil dihapus' };
    } catch (error) {
      console.error('[DB] Clear all error:', error.message);
      throw error;
    }
  }

  /**
   * Get absensi count by date
   */
  getAbsensiCountByDate(tanggal) {
    try {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM absensi WHERE tanggal = ?`);
      stmt.bind([tanggal]);
      stmt.step();
      const result = stmt.getAsObject();
      stmt.free();
      return result.count;
    } catch (error) {
      console.error('[DB] Count by date error:', error.message);
      throw error;
    }
  }

  /**
   * Cache acara list for offline use
   */
  cacheAcaraList(acaraList) {
    try {
      this.db.run(`DELETE FROM acara_cache`);

      const stmt = this.db.prepare(`
        INSERT INTO acara_cache (id, nama, deskripsi, tanggal_mulai, tanggal_selesai)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of acaraList) {
        stmt.run([
          item.id,
          item.nama || item.name,
          item.deskripsi || item.description,
          item.tanggalMulai || item.startDate,
          item.tanggalSelesai || item.endDate
        ]);
      }

      stmt.free();
      this.save();
      console.log('[DB] Cached', acaraList.length, 'acara');
    } catch (error) {
      console.error('[DB] Cache acara error:', error.message);
    }
  }

  /**
   * Get cached acara list
   */
  getCachedAcaraList() {
    try {
      const result = this.db.exec(`SELECT * FROM acara_cache`);
      return this.resultToArray(result);
    } catch (error) {
      console.error('[DB] Get cached acara error:', error.message);
      return [];
    }
  }

  /**
   * Get database statistics
   */
  getStats() {
    try {
      const total = this.db.exec(`SELECT COUNT(*) as total FROM absensi`);
      const synced = this.db.exec(`SELECT COUNT(*) as synced FROM absensi WHERE synced = 1`);
      const unsynced = this.db.exec(`SELECT COUNT(*) as unsynced FROM absensi WHERE synced = 0`);

      return {
        total: total[0]?.values[0]?.[0] || 0,
        synced: synced[0]?.values[0]?.[0] || 0,
        unsynced: unsynced[0]?.values[0]?.[0] || 0
      };
    } catch (error) {
      console.error('[DB] Get stats error:', error.message);
      return { total: 0, synced: 0, unsynced: 0 };
    }
  }

  /**
   * Convert sql.js result to array of objects
   */
  resultToArray(result) {
    if (!result || result.length === 0) return [];

    const columns = result[0].columns;
    const values = result[0].values;

    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.save();
      this.db.close();
      console.log('[DB] Database closed');
    }
  }
}

module.exports = AbsensiDatabase;
