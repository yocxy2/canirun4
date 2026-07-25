@echo off
chcp 65001 >nul
title CanIRun.AI Quick Start

echo ==========================================
echo   CanIRun.AI - Quick Start
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not detected. Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] OK Node.js installed:
for /f "tokens=*" %%a in ('node --version') do echo   %%a

REM Check if pnpm is installed
pnpm --version >nul 2>nul
if errorlevel 1 (
    echo.
    echo [2/3] WARN pnpm not installed, installing...
    npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] pnpm installation failed
        pause
        exit /b 1
    )
)

echo [2/3] OK pnpm installed:
for /f "tokens=*" %%a in ('pnpm --version') do echo   %%a

REM Check if dependencies are installed
if not exist "node_modules" (
    echo [3/3] WARN Dependencies not installed, installing...
    pnpm install
    if errorlevel 1 (
        echo [ERROR] Dependencies installation failed
        pause
        exit /b 1
    )
) else (
    echo [3/3] OK Dependencies installed
)

REM Check port availability
set DEFAULT_PORT=3000
echo.
echo Checking port %DEFAULT_PORT%...

REM Use netstat to check port
netstat -an | findstr ":%DEFAULT_PORT% " | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo WARN Port %DEFAULT_PORT% is in use.
    echo Attempting to free port %DEFAULT_PORT%...

    REM Get PID using the port and kill it
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%DEFAULT_PORT% " ^| findstr "LISTENING"') do (
        echo Killing process with PID: %%a
        taskkill /F /PID %%a >nul 2>nul
    )

    REM Check again
    timeout /t 1 /nobreak >nul
    netstat -an | findstr ":%DEFAULT_PORT% " | findstr "LISTENING" >nul
    if %errorlevel% equ 0 (
        echo ERROR: Failed to free port %DEFAULT_PORT%.
        echo Please manually stop the process using this port.
        echo You can find the process with: netstat -ano | findstr ":%DEFAULT_PORT%"
        pause
        exit /b 1
    ) else (
        echo OK Port %DEFAULT_PORT% is now free.
    )
) else (
    echo OK Port %DEFAULT_PORT% is available.
)

echo.
echo ==========================================
echo   Starting development server...
echo   Address: http://localhost:%DEFAULT_PORT%
echo ==========================================
echo.

REM Start development server
pnpm dev

pause
