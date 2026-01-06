-- =====================================================
-- Ngajiku Database Setup Script
-- Jalankan script ini di HeidiSQL untuk membuat database
-- Host: 127.0.0.1, Port: 3306
-- =====================================================

-- 1. Buat database (jika belum ada)
CREATE DATABASE IF NOT EXISTS ngajiku
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Gunakan database
USE ngajiku;

-- 3. Buat tabel absensi
CREATE TABLE IF NOT EXISTS absensi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  person_id INT NOT NULL COMMENT 'ID dari barcode',
  acara_id INT NOT NULL COMMENT 'ID acara/event',
  nama VARCHAR(255) NOT NULL COMMENT 'Nama peserta',
  tanggal_lahir VARCHAR(50) NULL COMMENT 'Tanggal lahir (opsional)',
  telepon VARCHAR(50) NULL COMMENT 'Nomor telepon (opsional)',
  posisi INT NULL DEFAULT 0 COMMENT 'Posisi (opsional)',
  photo_data LONGTEXT NULL COMMENT 'Base64 foto',
  tanggal VARCHAR(20) NOT NULL COMMENT 'Tanggal absen (YYYY-MM-DD)',
  tanggal_absen DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp absen',
  synced TINYINT DEFAULT 0 COMMENT '0=belum sync, 1=sudah sync',
  sync_error TEXT NULL COMMENT 'Error message jika gagal sync',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Index untuk pencarian cepat
  INDEX idx_person_acara_tanggal (person_id, acara_id, tanggal),
  INDEX idx_synced (synced),
  INDEX idx_tanggal (tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Buat tabel cache acara (untuk offline)
CREATE TABLE IF NOT EXISTS acara_cache (
  id INT PRIMARY KEY COMMENT 'ID acara dari API',
  nama VARCHAR(255) NULL COMMENT 'Nama acara',
  deskripsi TEXT NULL COMMENT 'Deskripsi acara',
  tanggal_mulai VARCHAR(50) NULL,
  tanggal_selesai VARCHAR(50) NULL,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Verifikasi tabel sudah dibuat
SHOW TABLES;

-- 6. Tampilkan struktur tabel
DESCRIBE absensi;
DESCRIBE acara_cache;

-- =====================================================
-- CATATAN PENGGUNAAN:
--
-- 1. Buka HeidiSQL
-- 2. Koneksi ke MySQL: Host=127.0.0.1, Port=3306
-- 3. Copy-paste script ini ke Query tab
-- 4. Tekan F9 atau klik Execute untuk menjalankan
--
-- Jika menggunakan user selain root, pastikan user
-- memiliki hak akses CREATE, INSERT, UPDATE, DELETE
-- =====================================================
