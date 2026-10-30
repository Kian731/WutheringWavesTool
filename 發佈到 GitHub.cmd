@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Wuthering Waves Tool GitHub Publisher

rem This script publishes the project beside it to the configured GitHub repository.
rem Authentication is handled by GitHub CLI's credential store; no token is saved here.
set "SOURCE=%~dp0."
set "REMOTE=https://github.com/Kian731/WutheringWavesTool.git"
set "PUBLISH_HOME=%LOCALAPPDATA%\WutheringWavesToolPublisher"
set "CHECKOUT=%PUBLISH_HOME%\WutheringWavesTool"

echo.
echo ==========================================
echo   Wuthering Waves Tool GitHub Publisher
echo ==========================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git for Windows was not found.
  goto :failed
)

where gh >nul 2>&1
if errorlevel 1 (
  echo [ERROR] GitHub CLI was not found.
  goto :failed
)

gh auth status -h github.com >nul 2>&1
if errorlevel 1 (
  echo GitHub sign-in is required. A browser will open next.
  echo Sign in with an account that can write to Kian731/WutheringWavesTool.
  gh auth login -h github.com -p https -w
  if errorlevel 1 (
    echo [ERROR] GitHub sign-in was not completed. Nothing was uploaded.
    goto :failed
  )
)

if not exist "%PUBLISH_HOME%" mkdir "%PUBLISH_HOME%"

if not exist "%CHECKOUT%\.git" (
  echo Downloading the GitHub repository for the first time...
  git clone "%REMOTE%" "%CHECKOUT%"
  if errorlevel 1 goto :git_failed
) else (
  echo Getting the latest GitHub version...
  git -C "%CHECKOUT%" fetch origin
  if errorlevel 1 goto :git_failed
  git -C "%CHECKOUT%" pull --ff-only
  if errorlevel 1 goto :git_failed
)

echo Syncing project files...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SOURCE%\Publish-Files.ps1" -Source "%SOURCE%" -Destination "%CHECKOUT%"
if errorlevel 1 (
  echo [ERROR] Copying the source files failed. Nothing was pushed.
  goto :failed
)

git -C "%CHECKOUT%" add -A
if errorlevel 1 goto :git_failed

git -C "%CHECKOUT%" diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo No files need to be uploaded.
  goto :done
)

for /f "delims=" %%B in ('git -C "%CHECKOUT%" branch --show-current') do set "BRANCH=%%B"
if "%BRANCH%"=="" set "BRANCH=main"

git -C "%CHECKOUT%" commit -m "Publish Wuthering Waves guide"
if errorlevel 1 goto :git_failed

echo Pushing to GitHub...
git -C "%CHECKOUT%" push origin "%BRANCH%"
if errorlevel 1 goto :git_failed

echo.
echo Upload completed:
echo https://github.com/Kian731/WutheringWavesTool
goto :done

:git_failed
echo.
echo [ERROR] GitHub sync failed. Check your network, account, and repository permission.
goto :failed

:failed
echo.
pause
exit /b 1

:done
echo.
pause
exit /b 0
