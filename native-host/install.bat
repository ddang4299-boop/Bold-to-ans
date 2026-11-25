@echo off
chcp 65001 >nul
where node >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js. Tai tai https://nodejs.org roi chay lai file nay.
  pause
  exit /b 1
)
node "%~dp0install.js"
pause
