@echo off
setlocal
chcp 65001 >nul 2>nul
title Wuthering Waves Guide
pushd "%~dp0" || goto NOPATH

where node >nul 2>nul
if errorlevel 1 goto NONODE

echo Starting local server at http://localhost:8777
echo Close this window to stop the server.
echo.
start "" "http://localhost:8777"
node ".claude\serve.js"
popd
exit /b 0

:NONODE
echo Node.js not found - opening index.html directly instead.
start "" "index.html"
exit /b 0

:NOPATH
echo   [X] Path error.
pause
exit /b 1
