@echo off
REM Create Distribution ZIP for Release
REM Run this script before creating a GitHub release

echo Creating pb-dashboard distribution ZIP...
echo.

REM Remove old ZIP if exists
if exist pb-dashboard.zip (
    del pb-dashboard.zip
    echo Removed old ZIP file
)

REM Create ZIP using PowerShell
powershell -Command "Compress-Archive -Path index.html,script.js,styles.css,logo.png,favicon.png,README.md,Customization.txt -DestinationPath pb-dashboard.zip -Force"

if exist pb-dashboard.zip (
    echo.
    echo SUCCESS! Created pb-dashboard.zip
    echo.
    echo Next steps:
    echo 1. Go to https://github.com/Nexroth/pb-dashboard/releases
    echo 2. Click 'Draft a new release'
    echo 3. Tag version: v2.0.1 (increment as needed^)
    echo 4. Upload this ZIP file
    echo 5. Use RELEASE_TEMPLATE.md for description
    echo 6. Publish release
    echo.
    pause
) else (
    echo ERROR: Failed to create ZIP
    pause
    exit /b 1
)