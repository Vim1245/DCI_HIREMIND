# ==============================================================================
# DCI HireMind - Stop Development Servers Script
# Stops FastAPI Backend and Vite Frontend safely.
# ==============================================================================

[CmdletBinding()]
param (
    [int[]]$Ports = @(5173, 8080, 8000)
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "      DCI HIREMIND - STOPPING DEV SERVERS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

function Get-PortProcessIds {
    param ([int]$Port)
    $pids = @()
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($c in $conns) {
                if ($c.OwningProcess -and $c.OwningProcess -gt 0) {
                    $pids += $c.OwningProcess
                }
            }
        }
    } catch {}

    # Netstat fallback
    try {
        $lines = netstat -ano | Select-String ":$Port\s+.*LISTENING\s+(\d+)"
        foreach ($line in $lines) {
            if ($line.Line -match ":$Port\s+.*LISTENING\s+(\d+)") {
                $pids += [int]$matches[1]
            }
        }
    } catch {}

    return ($pids | Select-Object -Unique)
}

$StoppedCount = 0

foreach ($Port in $Ports) {
    $procIds = Get-PortProcessIds -Port $Port
    if ($procIds) {
        foreach ($pidToStop in $procIds) {
            $proc = Get-Process -Id $pidToStop -ErrorAction SilentlyContinue
            $procName = if ($proc) { $proc.ProcessName } else { "Unknown" }
            
            Write-Host "Stopping process $pidToStop ($procName) on port $Port..." -ForegroundColor Yellow
            Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
            $StoppedCount++
        }
    } else {
        Write-Host "Port $Port is free (no active listener)." -ForegroundColor Gray
    }
}

# Optional: Close lingering PowerShell windows titled with DCI HireMind
$hiremindWindows = Get-Process powershell -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*DCI HireMind*"
}
foreach ($w in $hiremindWindows) {
    Write-Host "Closing terminal window: $($w.MainWindowTitle) (PID: $($w.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $w.Id -Force -ErrorAction SilentlyContinue
    $StoppedCount++
}

Start-Sleep -Seconds 1

# Re-check ports
$remaining = @()
foreach ($Port in $Ports) {
    $check = Get-PortProcessIds -Port $Port
    if ($check) {
        $remaining += $Port
    }
}

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
if ($remaining.Count -eq 0) {
    Write-Host "[OK] All DCI HireMind development servers have been stopped." -ForegroundColor Green
    Write-Host "Ports 5173, 8080, and 8000 are now clear." -ForegroundColor Green
} else {
    Write-Host "[WARNING] Some ports still have listeners: $($remaining -join ', ')" -ForegroundColor Red
}
Write-Host "==================================================" -ForegroundColor Cyan

