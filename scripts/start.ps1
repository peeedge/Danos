<#
.SYNOPSIS
  Bootstraps and starts the local Vite dev server for Danos.

.DESCRIPTION
  Checks the Node.js version, stops any Danos server already running for this repo
  or holding the port, installs dependencies when node_modules is missing or older
  than package-lock.json, then runs `npm run dev` in the foreground.

  Press Ctrl+C to stop it, or run ./scripts/close.ps1 from another terminal.

.PARAMETER Port
  Port to serve on. Defaults to 5173.

.PARAMETER Open
  Open the site in the default browser once the server responds.

.PARAMETER SkipInstall
  Never run `npm ci`, even if dependencies look out of date.

.EXAMPLE
  ./scripts/start.ps1
  ./scripts/start.ps1 -Port 5174 -Open
#>
param(
  [int]$Port = 5173,
  [switch]$Open,
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$minimumNode = [version]"20.0.0"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js was not found on PATH. Install Node $minimumNode or newer from https://nodejs.org."
}
$nodeVersion = [version]((& node --version).TrimStart("v"))
if ($nodeVersion -lt $minimumNode) {
  Write-Error "Node $nodeVersion is too old; Danos needs $minimumNode or newer."
}
Write-Host "Using Node $nodeVersion"

Push-Location $repo
try {
  # Stop first: a running server keeps files in node_modules locked, which makes `npm ci` fail on Windows.
  & (Join-Path $PSScriptRoot "close.ps1") -Port $Port

  $installedLock = Join-Path $repo "node_modules/.package-lock.json"
  $lockFile = Join-Path $repo "package-lock.json"
  $stale = -not (Test-Path $installedLock) -or
    ((Get-Item $lockFile).LastWriteTimeUtc -gt (Get-Item $installedLock).LastWriteTimeUtc)

  if ($stale -and -not $SkipInstall) {
    Write-Host "Installing dependencies (npm ci)..."
    & npm ci
    if ($LASTEXITCODE -ne 0) { Write-Error "npm ci failed with exit code $LASTEXITCODE." }
  }

  $url = "http://localhost:$Port"
  if ($Open) {
    Start-Job -ArgumentList $url -ScriptBlock {
      param($url)
      for ($i = 0; $i -lt 120; $i++) {
        try {
          Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null
          Start-Process $url
          return
        } catch { Start-Sleep -Seconds 1 }
      }
    } | Out-Null
  }

  Write-Host "Starting Danos at $url (Ctrl+C to stop, or run ./scripts/close.ps1)"
  & npm run dev -- --port $Port --strictPort
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
