# Create Distribution ZIP for Release
# Run this script before creating a GitHub release

Write-Host "Creating pb-dashboard distribution ZIP..." -ForegroundColor Cyan

# Files to include in distribution
$files = @(
    "index.html",
    "script.js",
    "styles.css",
    "logo.png",
    "favicon.png",
    "README.md",
    "Customization.txt"
)

# Output file
$outputZip = "pb-dashboard.zip"

# Remove old ZIP if exists
if (Test-Path $outputZip) {
    Remove-Item $outputZip
    Write-Host "Removed old ZIP file" -ForegroundColor Yellow
}

# Check all files exist
$missingFiles = @()
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "ERROR: Missing files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

# Create ZIP
Compress-Archive -Path $files -DestinationPath $outputZip -Force

if (Test-Path $outputZip) {
    $zipSize = (Get-Item $outputZip).Length / 1KB
    Write-Host "`nSUCCESS! Created $outputZip ($([math]::Round($zipSize, 2)) KB)" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Go to https://github.com/Nexroth/pb-dashboard/releases" -ForegroundColor White
    Write-Host "2. Click 'Draft a new release'" -ForegroundColor White
    Write-Host "3. Tag version: v2.0.1 (increment as needed)" -ForegroundColor White
    Write-Host "4. Upload this ZIP file" -ForegroundColor White
    Write-Host "5. Use RELEASE_TEMPLATE.md for description" -ForegroundColor White
    Write-Host "6. Publish release" -ForegroundColor White
} else {
    Write-Host "ERROR: Failed to create ZIP" -ForegroundColor Red
    exit 1
}