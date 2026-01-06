#!/bin/bash
# Ngajiku Autostart Setup Script for Raspberry Pi 4
# This script configures the application to start automatically on boot

APP_NAME="Ngajiku"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_HOME="$HOME"

echo "========================================"
echo "  $APP_NAME Autostart Setup"
echo "========================================"
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "This script is designed for Linux (Raspberry Pi OS)"
    echo "For Windows, use setup-autostart.bat instead"
    exit 1
fi

# Create autostart directory if not exists
AUTOSTART_DIR="$USER_HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"

# Create desktop entry for autostart
DESKTOP_FILE="$AUTOSTART_DIR/ngajiku.desktop"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=$APP_NAME
Comment=Aplikasi Absensi Pengajian
Exec=$APP_DIR/start.sh
Path=$APP_DIR
Terminal=false
StartupNotify=false
X-GNOME-Autostart-enabled=true
EOF

echo "✓ Created autostart entry: $DESKTOP_FILE"

# Create start script
START_SCRIPT="$APP_DIR/start.sh"

cat > "$START_SCRIPT" << 'EOF'
#!/bin/bash
# Ngajiku Startup Script

cd "$(dirname "$0")"

# Wait for display
sleep 5

# Set display environment
export DISPLAY=:0

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Hide cursor
unclutter -idle 0.5 -root &

# Start application
npm start
EOF

chmod +x "$START_SCRIPT"
echo "✓ Created start script: $START_SCRIPT"

# Create systemd service (alternative method)
SERVICE_FILE="/etc/systemd/system/ngajiku.service"

if [ "$EUID" -eq 0 ]; then
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=$APP_NAME Attendance Application
After=graphical.target

[Service]
Type=simple
User=$SUDO_USER
Environment=DISPLAY=:0
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
EOF

    systemctl daemon-reload
    systemctl enable ngajiku.service
    echo "✓ Created systemd service: $SERVICE_FILE"
    echo "✓ Enabled ngajiku.service"
else
    echo ""
    echo "To enable systemd service, run with sudo:"
    echo "  sudo bash setup-autostart.sh"
fi

# Optimize Raspberry Pi settings
echo ""
echo "========================================"
echo "  Recommended Raspberry Pi Settings"
echo "========================================"
echo ""
echo "Add these lines to /boot/config.txt:"
echo "  gpu_mem=128"
echo "  disable_overscan=1"
echo ""
echo "Add these lines to ~/.bashrc:"
echo "  export ELECTRON_DISABLE_GPU=1"
echo ""
echo "Install required packages:"
echo "  sudo apt update"
echo "  sudo apt install -y unclutter xdotool"
echo ""

echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "The application will start automatically on next boot."
echo "To start manually: ./start.sh"
echo "To disable autostart: rm $DESKTOP_FILE"
echo ""
