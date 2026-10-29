# Danos — stop the local Vite server started from this folder.
# Usage:  .\close.ps1   or   powershell -File close.ps1
& (Join-Path $PSScriptRoot "scripts\close.ps1") @args
exit $LASTEXITCODE
