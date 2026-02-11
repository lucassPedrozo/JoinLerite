@echo off
chcp 65001 >nul 2>&1
title JoinLerite - Setup ^& Launch
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File ".\start.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] O script encerrou com codigo de erro %ERRORLEVEL%.
)
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
