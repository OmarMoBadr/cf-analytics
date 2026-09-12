# Package Extension into a release ZIP archive

$ErrorActionPreference = "Stop"

$workspaceDir = $PSScriptRoot
Set-Location $workspaceDir

# Read version from manifest.json
$manifestPath = Join-Path $workspaceDir "manifest.json"
if (-not (Test-Path $manifestPath)) {
    Write-Error "manifest.json not found!"
    exit 1
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
$extensionName = "cf-harvest-v$version"
$zipFileName = "$extensionName.zip"
$zipPath = Join-Path $workspaceDir $zipFileName

Write-Host "Packaging $extensionName..." -ForegroundColor Cyan

# Remove existing zip if present
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Create temporary directory for staging clean files
$stagingDir = Join-Path $workspaceDir ".build_staging"
if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}

New-Item -ItemType Directory -Path $stagingDir | Out-Null

try {
    # Copy required files & folders
    Copy-Item (Join-Path $workspaceDir "manifest.json") -Destination $stagingDir
    Copy-Item (Join-Path $workspaceDir "LICENSE") -Destination $stagingDir -ErrorAction SilentlyContinue
    Copy-Item (Join-Path $workspaceDir "README.md") -Destination $stagingDir -ErrorAction SilentlyContinue
    Copy-Item (Join-Path $workspaceDir "src") -Destination $stagingDir -Recurse

    # Compress staging directory to zip
    Compress-Archive -Path "$stagingDir\*" -DestinationPath $zipPath -Force

    Write-Host "Successfully packaged extension!" -ForegroundColor Green
    Write-Host "Output ZIP file: $zipPath" -ForegroundColor Yellow
}
finally {
    # Clean up staging directory
    if (Test-Path $stagingDir) {
        Remove-Item $stagingDir -Recurse -Force
    }
}
