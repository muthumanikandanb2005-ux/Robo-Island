$distResources = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64\resources\app"
$sourceDir = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows"

# Remove old app.asar
$oldAsar = "C:\Users\muthu\.gemini\antigravity\scratch\dynamic-island-windows\dist\Robo Island-win32-x64\resources\app.asar"
if (Test-Path $oldAsar) { Remove-Item $oldAsar -Force }

if (-not (Test-Path $distResources)) {
    New-Item -ItemType Directory -Path $distResources -Force | Out-Null
}

$filesToCopy = @(
    "index.html",
    "styles.css",
    "island-app.js",
    "robo-eyes.js",
    "main.js",
    "media-service.js",
    "media_daemon.ps1",
    "system-service.js",
    "settings-service.js",
    "package.json",
    "icon.ico",
    "icon.png",
    "logo.png"
)

foreach ($f in $filesToCopy) {
    Copy-Item (Join-Path $sourceDir $f) -Destination (Join-Path $distResources $f) -Force
}

# Copy node_modules/systeminformation
$sysInfoDest = Join-Path $distResources "node_modules\systeminformation"
if (-not (Test-Path $sysInfoDest)) {
    New-Item -ItemType Directory -Path $sysInfoDest -Force | Out-Null
    Copy-Item (Join-Path $sourceDir "node_modules\systeminformation\*") -Destination $sysInfoDest -Recurse -Force
}

Write-Output "Successfully updated app files in dist\Robo Island-win32-x64\resources\app"
