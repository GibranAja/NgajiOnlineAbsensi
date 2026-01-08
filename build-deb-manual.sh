#!/bin/bash
# ============================================================
# Script Manual Build DEB dari folder unpacked
# Jalankan di Raspberry Pi setelah copy folder linux-arm64-unpacked
# ============================================================

set -e

APP_NAME="ngajiku"
APP_VERSION="1.0.0"
ARCH="arm64"
MAINTAINER="Iban dan Rasyad"
DESCRIPTION="Aplikasi Absensi Pengajian Offline-First"

# Warna
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}  Membuat DEB Package untuk Ngajiku${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Cek apakah folder unpacked ada
if [[ ! -d "dist/linux-arm64-unpacked" ]]; then
    echo -e "${RED}Error: Folder dist/linux-arm64-unpacked tidak ditemukan!${NC}"
    echo "Pastikan sudah menjalankan build atau copy folder dari Windows."
    exit 1
fi

# Buat struktur direktori DEB
DEB_DIR="dist/${APP_NAME}_${APP_VERSION}_${ARCH}"
rm -rf "$DEB_DIR"
mkdir -p "$DEB_DIR/DEBIAN"
mkdir -p "$DEB_DIR/opt/${APP_NAME}"
mkdir -p "$DEB_DIR/usr/share/applications"
mkdir -p "$DEB_DIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$DEB_DIR/usr/bin"

echo -e "${YELLOW}Copying aplikasi...${NC}"
cp -r dist/linux-arm64-unpacked/* "$DEB_DIR/opt/${APP_NAME}/"

# Buat file control
echo -e "${YELLOW}Membuat file DEBIAN/control...${NC}"
cat > "$DEB_DIR/DEBIAN/control" << EOF
Package: ${APP_NAME}
Version: ${APP_VERSION}
Section: utils
Priority: optional
Architecture: ${ARCH}
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
Maintainer: ${MAINTAINER}
Description: ${DESCRIPTION}
 Ngajiku adalah aplikasi absensi pengajian yang berjalan secara
 offline-first dengan sinkronisasi ke cloud storage.
EOF

# Buat file postinst (script setelah install)
echo -e "${YELLOW}Membuat file DEBIAN/postinst...${NC}"
cat > "$DEB_DIR/DEBIAN/postinst" << 'EOF'
#!/bin/bash
set -e

# Update icon cache
if command -v update-icon-caches &> /dev/null; then
    update-icon-caches /usr/share/icons/hicolor || true
fi

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database /usr/share/applications || true
fi

# Set permissions
chmod +x /opt/ngajiku/ngajiku

echo ""
echo "============================================"
echo "  Ngajiku berhasil diinstall!"
echo "============================================"
echo ""
echo "Jalankan aplikasi dari menu atau ketik: ngajiku"
echo ""

exit 0
EOF
chmod 755 "$DEB_DIR/DEBIAN/postinst"

# Buat file postrm (script setelah uninstall)
echo -e "${YELLOW}Membuat file DEBIAN/postrm...${NC}"
cat > "$DEB_DIR/DEBIAN/postrm" << 'EOF'
#!/bin/bash
set -e

# Update icon cache
if command -v update-icon-caches &> /dev/null; then
    update-icon-caches /usr/share/icons/hicolor || true
fi

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database /usr/share/applications || true
fi

exit 0
EOF
chmod 755 "$DEB_DIR/DEBIAN/postrm"

# Buat file .desktop
echo -e "${YELLOW}Membuat file desktop entry...${NC}"
cat > "$DEB_DIR/usr/share/applications/${APP_NAME}.desktop" << EOF
[Desktop Entry]
Name=Ngajiku
Comment=${DESCRIPTION}
Exec=/opt/${APP_NAME}/${APP_NAME} %U
Terminal=false
Type=Application
Icon=${APP_NAME}
Categories=Utility;Office;
StartupWMClass=Ngajiku
StartupNotify=true
EOF

# Copy icon
echo -e "${YELLOW}Copying icon...${NC}"
if [[ -f "icons/icon-256x256.png" ]]; then
    cp "icons/icon-256x256.png" "$DEB_DIR/usr/share/icons/hicolor/256x256/apps/${APP_NAME}.png"
elif [[ -f "icons/icon.png" ]]; then
    cp "icons/icon.png" "$DEB_DIR/usr/share/icons/hicolor/256x256/apps/${APP_NAME}.png"
fi

# Buat symlink untuk command line
echo -e "${YELLOW}Membuat symlink...${NC}"
ln -sf "/opt/${APP_NAME}/${APP_NAME}" "$DEB_DIR/usr/bin/${APP_NAME}"

# Set permissions
echo -e "${YELLOW}Setting permissions...${NC}"
chmod 755 "$DEB_DIR/opt/${APP_NAME}/${APP_NAME}"
find "$DEB_DIR" -type d -exec chmod 755 {} \;

# Build DEB package
echo -e "${YELLOW}Building DEB package...${NC}"
DEB_FILE="dist/${APP_NAME}_${APP_VERSION}_${ARCH}.deb"
dpkg-deb --build "$DEB_DIR" "$DEB_FILE"

# Cleanup
rm -rf "$DEB_DIR"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  DEB Package berhasil dibuat!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
ls -lh "$DEB_FILE"
echo ""
echo -e "${GREEN}Untuk install, jalankan:${NC}"
echo -e "${YELLOW}  sudo dpkg -i $DEB_FILE${NC}"
echo ""
echo -e "${GREEN}Jika ada error dependencies, jalankan:${NC}"
echo -e "${YELLOW}  sudo apt-get install -f${NC}"
echo ""
