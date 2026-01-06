@echo off
REM Ngajiku Autostart Setup Script for Windows
REM This script configures the application to start automatically on boot

set APP_NAME=Ngajiku
set SCRIPT_DIR=%~dp0
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

echo ========================================
echo   %APP_NAME% Autostart Setup (Windows)
echo ========================================
echo.

REM Create startup shortcut
set SHORTCUT_PATH=%STARTUP_DIR%\Ngajiku.lnk

REM Use PowerShell to create shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%SCRIPT_DIR%start.bat'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [OK] Created startup shortcut: %SHORTCUT_PATH%
) else (
    echo [ERROR] Failed to create shortcut
    exit /b 1
)

REM Create start batch file
set START_BAT=%SCRIPT_DIR%start.bat

echo @echo off > "%START_BAT%"
echo cd /d "%SCRIPT_DIR%" >> "%START_BAT%"
echo npm start >> "%START_BAT%"

echo [OK] Created start script: %START_BAT%

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo The application will start automatically on next login.
echo To start manually: start.bat
echo To disable autostart: Delete %SHORTCUT_PATH%
echo.

pause
