#!/bin/bash
# ============================================================
# Script Build DEB Installer untuk Ngajiku - Raspberry Pi 4
# Jalankan script ini di Raspberry Pi atau sistem Linux Debian
# ============================================================

set -e

echo "=================================================="
echo "  Ngajiku - Build DEB Installer untuk Raspberry Pi"
echo "=================================================="
echo ""

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cek apakah berjalan di Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo -e "${RED}Error: Script ini harus dijalankan di Linux!${NC}"
    echo "Silakan copy folder project ke Raspberry Pi dan jalankan script ini di sana."
    exit 1
fi

# Cek arsitektur
ARCH=$(dpkg --print-architecture)
echo -e "${YELLOW}Arsitektur terdeteksi: $ARCH${NC}"

# Cek dan install dependencies yang diperlukan
echo ""
echo -e "${YELLOW}Mengecek dependencies...${NC}"

install_if_missing() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${YELLOW}Installing $2...${NC}"
        sudo apt-get update
        sudo apt-get install -y $2
    else
        echo -e "${GREEN}✓ $2 sudah terinstall${NC}"
    fi
}

# Install Node.js jika belum ada
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}✓ Node.js $(node --version) sudah terinstall${NC}"
fi

# Install npm jika belum ada
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}Installing npm...${NC}"
    sudo apt-get install -y npm
else
    echo -e "${GREEN}✓ npm $(npm --version) sudah terinstall${NC}"
fi

# Install fpm untuk membuat .deb
if ! command -v fpm &> /dev/null; then
    echo -e "${YELLOW}Installing fpm (Effing Package Management)...${NC}"
    sudo apt-get install -y ruby ruby-dev build-essential
    sudo gem install fpm
else
    echo -e "${GREEN}✓ fpm sudah terinstall${NC}"
fi

# Pindah ke direktori project
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo ""
echo -e "${YELLOW}Direktori project: $SCRIPT_DIR${NC}"

# Install npm dependencies
echo ""
echo -e "${YELLOW}Installing npm dependencies...${NC}"
npm install

# Build aplikasi
echo ""
echo -e "${YELLOW}Building Electron app untuk Linux $ARCH...${NC}"

# Set environment variables untuk skip code signing
export CSC_IDENTITY_AUTO_DISCOVERY=false

# Build dengan electron-builder
if [[ "$ARCH" == "arm64" || "$ARCH" == "aarch64" ]]; then
    npx electron-builder --linux deb --arm64
elif [[ "$ARCH" == "armhf" || "$ARCH" == "armv7l" ]]; then
    npx electron-builder --linux deb --armv7l
else
    npx electron-builder --linux deb --$ARCH
fi

echo ""
echo -e "${GREEN}=================================================="
echo "  Build selesai!"
echo "==================================================${NC}"
echo ""

# Cari file .deb yang dibuat
DEB_FILE=$(find ./dist -name "*.deb" -type f | head -1)

if [[ -n "$DEB_FILE" ]]; then
    echo -e "${GREEN}File DEB installer berhasil dibuat:${NC}"
    echo -e "${YELLOW}$DEB_FILE${NC}"
    echo ""
    ls -lh "$DEB_FILE"
    echo ""
    echo -e "${GREEN}Untuk install, jalankan:${NC}"
    echo -e "${YELLOW}sudo dpkg -i $DEB_FILE${NC}"
    echo ""
    echo -e "${GREEN}Atau double-click file .deb di file manager${NC}"
else
    echo -e "${RED}Error: File .deb tidak ditemukan!${NC}"
    exit 1
fi

echo ""
echo "=================================================="
