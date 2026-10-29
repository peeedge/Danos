@echo off
rem Danos - stop the local Vite server started from this folder.
rem Safe to double-click from Explorer, and safe to run from cmd or PowerShell.

setlocal
pushd "%~dp0"

set "PS=pwsh"
where pwsh >nul 2>&1 || set "PS=powershell"

"%PS%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0close.ps1" %*
set "EXITCODE=%ERRORLEVEL%"

popd

if not "%EXITCODE%"=="0" (
  echo.
  echo Exited with code %EXITCODE%.
  pause
)

exit /b %EXITCODE%
