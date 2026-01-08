# Panduan Build DEB Installer untuk Raspberry Pi 4

## Kenapa Tidak Bisa Build .deb di Windows?

Build file `.deb` memerlukan tool `fpm` atau `dpkg-deb` yang hanya tersedia di Linux. Oleh karena itu, ada 2 cara untuk membuat installer `.deb`:

---

## Cara 1: Build Langsung di Raspberry Pi (Recommended)

### Langkah-langkah:

1. **Copy seluruh folder project ke Raspberry Pi**
   ```bash
   # Dari komputer Windows, gunakan SCP atau USB
   scp -r /path/to/NgajiNormal pi@raspberry-ip:/home/pi/
   ```

2. **Di Raspberry Pi, jalankan script build:**
   ```bash
   cd /home/pi/NgajiNormal
   chmod +x build-deb-raspi.sh
   ./build-deb-raspi.sh
   ```

3. **Install .deb yang sudah dibuat:**
   ```bash
   sudo dpkg -i dist/Ngajiku-1.0.0-arm64.deb
   ```

---

## Cara 2: Build Manual dari Folder Unpacked

Jika sudah ada folder `linux-arm64-unpacked` dari build di Windows:

1. **Copy folder project ke Raspberry Pi** (pastikan folder `dist/linux-arm64-unpacked` ikut ter-copy)

2. **Di Raspberry Pi, jalankan:**
   ```bash
   cd /home/pi/NgajiNormal
   chmod +x build-deb-manual.sh
   ./build-deb-manual.sh
   ```

3. **Install:**
   ```bash
   sudo dpkg -i dist/ngajiku_1.0.0_arm64.deb
   ```

---

## File yang Sudah Dibuat

| File | Deskripsi |
|------|-----------|
| `build-deb-raspi.sh` | Script build lengkap (install dependencies + build) |
| `build-deb-manual.sh` | Script build dari folder unpacked yang sudah ada |
| `dist/linux-arm64-unpacked/` | Aplikasi yang sudah di-build untuk ARM64 |

---

## Setelah Install

- Aplikasi akan terinstall di `/opt/ngajiku/`
- Bisa dijalankan dari menu aplikasi atau ketik `ngajiku` di terminal
- Shortcut otomatis dibuat di desktop menu

---

## Uninstall

```bash
sudo dpkg -r ngajiku
```

---

## Troubleshooting

### Error: Dependencies tidak terpenuhi
```bash
sudo apt-get install -f
```

### Error: Permission denied saat jalankan script
```bash
chmod +x build-deb-raspi.sh
chmod +x build-deb-manual.sh
```

### Error: Node.js tidak ditemukan
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```
