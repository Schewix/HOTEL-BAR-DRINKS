@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Nainstaluj Node.js z https://nodejs.org a spust znovu. & pause & exit /b 1)
if not exist node_modules call npm install --omit=dev
start "" http://127.0.0.1:8080
node src/index.js
pause
