#!/usr/bin/env pwsh
#requires -Version 5.1

<#
.SYNOPSIS
    CanIRun.AI Quick Start Script
.DESCRIPTION
    Quick start CanIRun.AI development environment
.EXAMPLE
    .\quickstart.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# Set console encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host @"
==========================================
  CanIRun.AI - Quick Start
==========================================
"@ -ForegroundColor Cyan

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[1/3] OK Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not detected. Please install Node.js first." -ForegroundColor Red
    Write-Host "Download: https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

# Check and install pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "[2/3] OK pnpm installed: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "[2/3] WARN pnpm not installed, installing..." -ForegroundColor Yellow
    try {
        npm install -g pnpm
        if ($LASTEXITCODE -eq 0) {
            $pnpmVersion = pnpm --version
            Write-Host "[2/3] OK pnpm installed: $pnpmVersion" -ForegroundColor Green
        } else {
            throw "pnpm installation failed"
        }
    } catch {
        Write-Host "[ERROR] pnpm installation failed" -ForegroundColor Red
        pause
        exit 1
    }
}

# Check and install dependencies
if (-not (Test-Path -Path "node_modules" -PathType Container)) {
    Write-Host "[3/3] WARN Dependencies not installed, installing..." -ForegroundColor Yellow
    try {
        pnpm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[3/3] OK Dependencies installed" -ForegroundColor Green
        } else {
            throw "Dependencies installation failed"
        }
    } catch {
        Write-Host "[ERROR] Dependencies installation failed" -ForegroundColor Red
        pause
        exit 1
    }
} else {
    Write-Host "[3/3] OK Dependencies installed" -ForegroundColor Green
}

# Check port availability
$DefaultPort = 3000
Write-Host ""
Write-Host "Checking port $DefaultPort..." -ForegroundColor Cyan

$PortInUse = $false
try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $DefaultPort)
    $listener.Start()
    $listener.Stop()
} catch {
    $PortInUse = $true
}

if ($PortInUse) {
    Write-Host "WARN Port $DefaultPort is in use." -ForegroundColor Yellow
    Write-Host "Attempting to free port $DefaultPort..." -ForegroundColor Yellow

    # Get process using the port and kill it
    $process = Get-NetTCPConnection -LocalPort $DefaultPort -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($process) {
        $pid = $process.OwningProcess
        Write-Host "Killing process with PID: $pid" -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }

    Start-Sleep -Seconds 1

    # Check again
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $DefaultPort)
        $listener.Start()
        $listener.Stop()
        Write-Host "OK Port $DefaultPort is now free." -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to free port $DefaultPort." -ForegroundColor Red
        Write-Host "Please manually stop the process using this port." -ForegroundColor Yellow
        Write-Host "You can find the process with: Get-NetTCPConnection -LocalPort $DefaultPort" -ForegroundColor Yellow
        pause
        exit 1
    }
} else {
    Write-Host "OK Port $DefaultPort is available." -ForegroundColor Green
}

Write-Host ""
Write-Host @"
==========================================
  Starting development server...
  Address: http://localhost:$DefaultPort
==========================================
"@ -ForegroundColor Cyan

# Start development server
pnpm dev
