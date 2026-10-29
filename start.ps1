# Danos — bootstrap and start the local Vite server.
# Usage:  .\start.ps1   or   powershell -File start.ps1
& (Join-Path $PSScriptRoot "scripts\start.ps1") @args
exit $LASTEXITCODE
