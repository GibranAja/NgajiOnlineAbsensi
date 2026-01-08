# Ngajiku Icons

Icon set untuk aplikasi Ngajiku (Aplikasi Absensi Pengajian).

## Desain Icon

Icon ini menampilkan:
- 🟢 Background hijau (melambangkan Islam)
- 📖 Buku/Al-Quran (melambangkan pengajian)
- ✅ Checkmark biru (melambangkan absensi/kehadiran)
- "N" huruf tebal (singkatan dari Ngajiku)

## File Icons yang Tersedia

### Icon Utama
- **icon.svg** - Source SVG vector (dapat diedit)
- **icon.png** - Icon utama 512x512px
- **icon.ico** - Multi-size ICO untuk Windows (16, 32, 48, 64, 128, 256)

### PNG - Berbagai Ukuran Standar
- icon-16x16.png
- icon-24x24.png
- icon-32x32.png
- icon-48x48.png
- icon-64x64.png
- icon-128x128.png
- icon-256x256.png
- icon-512x512.png
- icon-1024x1024.png

### ICO-Ready PNG Files
File PNG yang sudah optimal untuk konversi ke ICO:
- icon-ico-16.png
- icon-ico-32.png
- icon-ico-48.png
- icon-ico-64.png
- icon-ico-128.png
- icon-ico-256.png

### Raspberry Pi Optimized
Icon yang dioptimalkan untuk Raspberry Pi 4:
- icon-raspi-96x96.png
- icon-raspi-192x192.png
- icon-raspi-256x256.png
- icon-raspi-512x512.png

## Regenerasi Icons

Jika ingin memodifikasi atau regenerasi icons:

1. Edit file `icon.svg` sesuai kebutuhan
2. Jalankan script generator:
   ```bash
   node generate-icons.js
   ```

## Penggunaan dalam Electron Builder

Icons sudah dikonfigurasi di `package.json`:
- **Windows**: Menggunakan `icon.ico` (multi-size)
- **Linux**: Menggunakan folder `icons/` (auto-detect size)
- **macOS**: Menggunakan `icon.png`

## Dependencies

Script generator menggunakan:
- `sharp` - Image processing
- `to-ico` - ICO file generation

Install dengan:
```bash
npm install --save-dev sharp to-ico
```

## Format dan Ukuran yang Direkomendasikan

### Windows (.ico)
- 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 ✅

### Linux (.png)
- 16x16, 32x32, 48x48, 64x64, 96x96, 128x128, 192x192, 256x256, 512x512 ✅

### macOS (.icns atau .png)
- 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024 ✅

### Raspberry Pi 4
- 96x96, 192x192, 256x256, 512x512 ✅ (optimal untuk display)

## Lisensi

Icons ini merupakan bagian dari aplikasi Ngajiku dan mengikuti lisensi MIT dari project utama.
