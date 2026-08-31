@echo off
chcp 65001 >nul
title 鳴潮攻略站
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 找不到 Node.js，改用直接開檔的方式...
  start "" "index.html"
  exit /b 0
)
echo 啟動本機伺服器 http://localhost:8777 ...
echo 關閉這個視窗就會停止伺服器。
start "" "http://localhost:8777"
node ".claude\serve.js"
