# Ngajiku - Aplikasi Absensi Pengajian

Aplikasi kiosk absensi pengajian berbasis Electron.js dengan arsitektur offline-first, dioptimalkan untuk Raspberry Pi 4.

## Fitur Utama

- ✅ **Offline-First**: Data tersimpan lokal di SQLite, sinkronisasi saat online
- ✅ **Barcode Scanner**: Support scanner HID (PandaTM atau sejenis)
- ✅ **Webcam Capture**: Capture foto otomatis saat absensi
- ✅ **State-Based Flow**: Alur aplikasi terstruktur dan mudah dipahami
- ✅ **Auto-Start**: Otomatis jalan saat boot
- ✅ **Kiosk Mode**: Fullscreen, tanpa akses keluar tanpa autentikasi
- ✅ **Validasi Duplikat**: Satu orang hanya bisa absen sekali per acara per hari

## Persyaratan Sistem

### Hardware
- Raspberry Pi 4 (4GB RAM) atau PC dengan spesifikasi setara
- Barcode Scanner USB (HID Mode) - PandaTM atau kompatibel
- Webcam USB eksternal
- Monitor touchscreen (opsional)

### Software
- Node.js 18.x atau lebih baru
- npm 9.x atau lebih baru
- Git (untuk clone repository)

## Instalasi

### 1. Clone/Download Project

```bash
cd /path/to/your/folder
# Jika sudah memiliki folder project, skip langkah ini
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Native Modules (untuk Raspberry Pi)

```bash
npm run postinstall
```

### 4. Jalankan Aplikasi

```bash
npm start
```

## Setup Autostart

### Raspberry Pi / Linux

```bash
chmod +x setup-autostart.sh
./setup-autostart.sh
```

### Windows

```batch
setup-autostart.bat
```

## Struktur Project

```
Ngajiku/
├── main.js                 # Electron main process
├── preload.js              # Secure bridge (IPC)
├── package.json            # Project configuration
├── setup-autostart.sh      # Linux autostart setup
├── setup-autostart.bat     # Windows autostart setup
└── src/
    ├── database.js         # SQLite database layer
    └── renderer/
        ├── index.html      # Main HTML
        ├── styles.css      # Stylesheet
        ├── app.js          # Application logic
        └── api.js          # API service
```

## Alur Aplikasi

```
┌─────────────────────┐
│   1. Pilih Acara    │
│   (Event Select)    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   2. Mode Scan      │
│   (Barcode Input)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   3. Validasi User  │
│   (5 detik timer)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   4. Capture Foto   │
│   (Webcam)          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   5. Konfirmasi     │
│   (Submit/Retake)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   6. Sukses         │
│   (3 detik modal)   │
└─────────┬───────────┘
          │
          ▼
     Kembali ke #2
```

## Format Barcode

Barcode harus berisi JSON dengan format:

```json
{
  "Id": 123,
  "Nama": "Ahmad Abdullah",
  "TanggalLahir": "1990-05-15",
  "Telepon": "081234567890",
  "Posisi": 1
}
```

**Catatan**:
- `Id` dan `Nama` wajib ada
- `TanggalLahir`, `Telepon`, `Posisi` boleh null

## API Endpoints

Aplikasi menggunakan API dari `https://cimanggu.my.id/api/`:

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/Absensi/InputAbsenWithImageBytes` | POST | Submit absensi dengan foto |
| `/Absensi/GetAbsensiByAcaraId` | GET | Ambil data absensi per acara |

**Authentication**: Query parameter `ApiKey=123qweasd`

## Database Schema

### Tabel `absensi`

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| person_id | INTEGER | ID dari barcode |
| acara_id | INTEGER | ID acara/event |
| nama | TEXT | Nama peserta |
| tanggal_lahir | TEXT | Tanggal lahir (nullable) |
| telepon | TEXT | Nomor telepon (nullable) |
| posisi | INTEGER | Posisi (nullable) |
| photo_data | TEXT | Base64 foto |
| tanggal | TEXT | Tanggal absen (YYYY-MM-DD) |
| tanggal_absen | DATETIME | Timestamp absen |
| synced | INTEGER | Status sinkronisasi (0/1) |
| sync_error | TEXT | Error saat sync (nullable) |

## Konfigurasi Warna

| Penggunaan | Warna | Persentase |
|------------|-------|------------|
| Background | #FFF8F0 | 60% |
| Interaction | #FFCF99 | 30% |
| Accent | #92140C | 10% |

## Font

- **Barlow**: Font utama untuk body text (75%)
- **Albert Sans**: Font untuk heading (25%)

## Optimasi Raspberry Pi

### /boot/config.txt

```ini
gpu_mem=128
disable_overscan=1
```

### Environment Variables

```bash
export ELECTRON_DISABLE_GPU=1
```

### Rekomendasi Package

```bash
sudo apt update
sudo apt install -y unclutter xdotool
```

## Troubleshooting

### Kamera tidak terdeteksi

```bash
# Cek device
ls /dev/video*

# Berikan permission
sudo usermod -a -G video $USER
```

### Barcode scanner tidak berfungsi

1. Pastikan scanner dalam mode HID (Keyboard)
2. Test dengan text editor biasa
3. Pastikan fokus pada input field

### Database error

```bash
# Reset database (HATI-HATI: Data hilang!)
rm ~/.config/ngajiku/ngajiku.db
```

### Aplikasi crash saat startup

```bash
# Jalankan dengan debug
DEBUG=* npm start
```

## Build untuk Production

### Linux (Raspberry Pi)

```bash
npm run build
```

### Windows

```bash
npm run build:win
```

## Lisensi

MIT License - Silakan gunakan dan modifikasi sesuai kebutuhan.

## Kontributor

Dikembangkan untuk kebutuhan absensi pengajian di komunitas.

---

**Catatan**: Pastikan selalu backup database secara berkala untuk menghindari kehilangan data.
