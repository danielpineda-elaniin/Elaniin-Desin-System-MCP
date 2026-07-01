@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Falta Node.js. Instala desde https://nodejs.org y reintenta.
  pause
  exit /b 1
)
call npm install --omit=dev || (pause & exit /b 1)
node install.mjs
pause
