@echo off
title GeoBatik Madura - Server WebGIS
echo ========================================================
echo   Memulai GeoBatik Madura (WebGIS Batik Madura)
echo   Oleh: SARIFATUL MAIMUNA (NPM: 20241230009)
echo ========================================================
echo.
cd /d "%~dp0"
echo Membuka server di port 3000...
echo.
start "" "http://localhost:3000"
node server.js
pause

