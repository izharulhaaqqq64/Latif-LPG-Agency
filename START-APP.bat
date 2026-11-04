@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)
node -e "require('node:sqlite')" >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 or newer from https://nodejs.org
  pause
  exit /b 1
)
node -e "const s=require('net').createServer();s.once('error',()=>process.exit(1));s.listen(3000,'127.0.0.1',()=>s.close());" >nul 2>nul
if errorlevel 1 (
  echo Port 3000 is already in use. Close the old Latif LPG server window, then try again.
  pause
  exit /b 1
)
echo Keep the server window open while using the app.
echo On first use, copy the setup code from the server window to create your owner login.
start "Latif LPG Server" node server.js
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
