@echo off
title Push ke GitHub - GeoBatik Madura
echo ========================================================
echo   Melakukan Git Push ke repositori:
echo   https://github.com/sss36217381-ux/batik-madura.git
echo ========================================================
echo.
cd /d "%~dp0"
echo Menjalankan: git push -u origin main...
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   BERHASIL! Proyek berhasil di-push ke GitHub!
    echo ========================================================
) else (
    echo.
    echo Gagal melakukan push. Pastikan Anda sudah login ke akun GitHub
    echo atau memasukkan Personal Access Token (PAT).
)
echo.
pause

