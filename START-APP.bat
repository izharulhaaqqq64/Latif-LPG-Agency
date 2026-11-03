@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)
echo Keep the server window open while using the app.
start "Latif LPG Server" node server.js
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
