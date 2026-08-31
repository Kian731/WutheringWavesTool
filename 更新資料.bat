@echo off
chcp 65001 >nul
title 鳴潮攻略站 - 更新資料
cd /d "%~dp0tools"

echo ============================================================
echo   鳴潮攻略站 資料更新
echo   會自動抓取 BWIKI 與庫街區官方 WIKI 的最新內容
echo   新角色、新武器、新聲骸、新套裝、新攻略都會一併補進來
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] 找不到 Node.js
  echo.
  echo     請先到 https://nodejs.org 下載安裝 LTS 版本，
  echo     安裝完把這個視窗關掉，重新執行一次就好。
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/2] 第一次執行，安裝相依套件...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo [X] 套件安裝失敗，請確認網路連線後再試一次。
    pause
    exit /b 1
  )
  echo.
)

echo [2/2] 開始更新，整個流程大約 3 到 8 分鐘，請不要關閉視窗...
echo.
node update.mjs
set RC=%errorlevel%

echo.
if "%RC%"=="0" (
  echo ============================================================
  echo   更新完成。用瀏覽器開啟 index.html 就能看到最新內容。
  echo   若畫面沒變，請在瀏覽器按 Ctrl+F5 強制重新整理。
  echo ============================================================
) else (
  echo ============================================================
  echo   更新中斷。上面紅字那一行就是失敗的步驟，
  echo   通常是網路不穩或對方網站擋流量，過幾分鐘再跑一次多半就好。
  echo   資料已自動備份在 data\_prev\ ，網站不會壞掉。
  echo ============================================================
)
echo.
pause
