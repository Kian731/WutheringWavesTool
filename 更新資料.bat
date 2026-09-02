@echo off
setlocal
chcp 65001 >nul 2>nul
title Wuthering Waves Guide - Update Data
pushd "%~dp0tools" || goto NOPATH

where node >nul 2>nul
if errorlevel 1 goto NONODE

if not exist "node_modules" goto INSTALL
goto RUN

:INSTALL
echo Installing dependencies (first run only)...
echo.
call npm install --no-audit --no-fund
if errorlevel 1 goto NPMFAIL
echo.

:RUN
node update.mjs
if errorlevel 1 goto RUNFAIL
popd
echo.
pause
exit /b 0

:NONODE
echo.
echo   [X] Node.js not found.
echo   Please install the LTS version from https://nodejs.org
echo   then close this window and run this file again.
echo.
pause
exit /b 1

:NPMFAIL
echo.
echo   [X] npm install failed. Check your internet connection and retry.
echo.
pause
exit /b 1

:RUNFAIL
popd
echo.
echo   [X] Update stopped. See the failing step above.
echo   Usually a network hiccup or the source site rate-limiting.
echo   Wait a few minutes and run again. Your data is backed up in data\_prev\
echo.
pause
exit /b 1

:NOPATH
echo   [X] Cannot find the tools folder next to this file.
pause
exit /b 1
