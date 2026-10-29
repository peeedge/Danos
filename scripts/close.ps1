<#
.SYNOPSIS
  Stops local Vite servers started from this repo.

.PARAMETER Port
  Also stop whatever Node process is listening on these ports, even if it was started elsewhere.
  Defaults to 5173; pass -Port @() to only stop servers started from this repo.

.PARAMETER DryRun
  List matching processes without stopping them.

.EXAMPLE
  ./scripts/close.ps1
  ./scripts/close.ps1 -DryRun
  ./scripts/close.ps1 -Port 5173,5174
#>
param(
  [int[]]$Port = @(5173),
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoPattern = [regex]::Escape($repo)

$targets = @{}

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
  Where-Object {
    $_.CommandLine -and
    $_.CommandLine -match $repoPattern -and
    $_.CommandLine -match "vite|npm run dev|npm run start"
  } |
  ForEach-Object { $targets[[int]$_.ProcessId] = $_.CommandLine }

foreach ($p in $Port) {
  Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
      $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $_"
      if ($proc -and $proc.Name -eq "node.exe") { $targets[[int]$proc.ProcessId] = $proc.CommandLine }
    }
}

if ($targets.Count -eq 0) {
  Write-Host "No local Danos servers found for $repo."
  exit 0
}

foreach ($id in @($targets.Keys)) {
  $ports = (Get-NetTCPConnection -State Listen -OwningProcess $id -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty LocalPort -Unique) -join ","
  $label = if ($ports) { "PID $id (port $ports)" } else { "PID $id" }

  if ($DryRun) {
    Write-Host "Would stop $label`n  $($targets[$id])"
    continue
  }

  if (-not (Get-Process -Id $id -ErrorAction SilentlyContinue)) {
    Write-Host "Already gone: $label"
    continue
  }

  # Windows PowerShell turns native stderr into a terminating error under "Stop".
  $ErrorActionPreference = "Continue"
  & taskkill.exe /PID $id /T /F *> $null
  $ErrorActionPreference = "Stop"
  if ($LASTEXITCODE -eq 0) { Write-Host "Stopped $label" }
  elseif (-not (Get-Process -Id $id -ErrorAction SilentlyContinue)) { Write-Host "Already gone: $label" }
  else { Write-Warning "Could not stop $label (exit code $LASTEXITCODE)" }
}
