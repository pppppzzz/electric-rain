@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS to use the optional hardware server.
  echo The offline index.html demo does not need Node.js.
  pause
  exit /b 1
)
echo Electric Rain - optional hardware connection server
echo Keep this window open. Press Ctrl+C to stop.
node.exe "%~dp0web\native\serve.cjs"
if errorlevel 1 pause
endlocal
