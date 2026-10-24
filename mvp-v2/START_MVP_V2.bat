@echo off
setlocal
cd /d "%~dp0\.."
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 is required to run this isolated MVP v2 test.
  pause
  exit /b 1
)
echo Starting AI ADVOKAT 4 MVP v2 on http://127.0.0.1:4174/
start "" http://127.0.0.1:4174/
node mvp-v2\server.mjs
endlocal
