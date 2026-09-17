$projectRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $projectRoot 'extension\manifest.json'
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$distDir = Join-Path $projectRoot 'dist'
$archivePath = Join-Path $distDir "SilhouetteAI-v$($manifest.version).zip"

New-Item -ItemType Directory -Force -Path $distDir | Out-Null
if (Test-Path -LiteralPath $archivePath) {
  Remove-Item -LiteralPath $archivePath
}

Compress-Archive -Path (Join-Path $projectRoot 'extension\*') -DestinationPath $archivePath
Write-Output $archivePath
