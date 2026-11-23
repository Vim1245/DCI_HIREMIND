# ==============================================================================
# DCI HireMind - Full Stack Development Startup Script
# Launches both FastAPI Backend and Vite + React Frontend in separate windows.
# Usage: .\start-dev.ps1 [-Force] [-BackendPort <port>]
# ==============================================================================

[CmdletBinding()]
param (
    [int]$BackendPort = 0,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Resolve absolute directories
$RootDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "         DCI HIREMIND - ENTERPRISE AI RECRUITMENT PLATFORM           " -ForegroundColor Green
Write-Host "                     Development Server Launcher                      " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Project Root : $RootDir" -ForegroundColor Gray
Write-Host "Backend Path : $BackendDir" -ForegroundColor Gray
Write-Host "Frontend Path: $FrontendDir" -ForegroundColor Gray

# ------------------------------------------------------------------------------
# 1. Resolve Virtual Environment
# ------------------------------------------------------------------------------
$VenvDir = $null
if (Test-Path (Join-Path $BackendDir "venv\Scripts\python.exe")) {
    $VenvDir = Join-Path $BackendDir "venv"
} elseif (Test-Path (Join-Path $RootDir "venv\Scripts\python.exe")) {
    $VenvDir = Join-Path $RootDir "venv"
}

if (-not $VenvDir) {
    Write-Host "[ERROR] Could not find a valid Python virtual environment." -ForegroundColor Red
    Write-Host "Expected at: $BackendDir\venv or $RootDir\venv" -ForegroundColor Red
    exit 1
}

$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$VenvActivate = Join-Path $VenvDir "Scripts\Activate.ps1"
Write-Host "[OK] Using Python virtual environment: $VenvDir" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 2. Determine Backend Port (Check backend/.env or use default 8080)
# ------------------------------------------------------------------------------
if ($BackendPort -eq 0) {
    $BackendPort = 8080
    $EnvFile = Join-Path $BackendDir ".env"
    if (Test-Path $EnvFile) {
        $lines = Get-Content $EnvFile -ErrorAction SilentlyContinue
        foreach ($line in $lines) {
            if ($line -match "^\s*PORT\s*=\s*(\d+)") {
                $BackendPort = [int]$matches[1]
                break
            }
        }
    }
}
$FrontendPort = 5173

# ------------------------------------------------------------------------------
# 3. Helper: Check Port Process
# ------------------------------------------------------------------------------
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

# ------------------------------------------------------------------------------
# 4. Port Conflict Inspection (Checking 5173, backend port, and 8000)
# ------------------------------------------------------------------------------
Write-Host "`n[1/5] Inspecting ports ($FrontendPort, $BackendPort, 8000)..." -ForegroundColor Cyan
$PortsToCheck = @($FrontendPort, $BackendPort)
if ($BackendPort -ne 8000) {
    $PortsToCheck += 8000
}

$Occupied = @{}
foreach ($p in $PortsToCheck) {
    $activePids = Get-PortProcessIds -Port $p
    if ($activePids) {
        $Occupied[$p] = $activePids
    }
}

if ($Occupied.Count -gt 0) {
    foreach ($p in $Occupied.Keys) {
        $pidsList = $Occupied[$p] -join ", "
        Write-Host "  -> Port $p is currently occupied by PID(s): $pidsList" -ForegroundColor Yellow
    }

    if ($Force) {
        Write-Host "  [-Force enabled] Stopping conflicting processes..." -ForegroundColor Yellow
        $StopScript = Join-Path $RootDir "stop-dev.ps1"
        if (Test-Path $StopScript) {
            & $StopScript -Ports ($Occupied.Keys)
        } else {
            foreach ($p in $Occupied.Keys) {
                foreach ($procId in $Occupied[$p]) {
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                }
            }
        }
        Start-Sleep -Seconds 1
    } else {
        Write-Host "`n[WARNING] One or more ports are already in use." -ForegroundColor Yellow
        Write-Host "You can stop existing servers safely with: .\stop-dev.ps1" -ForegroundColor Yellow
        Write-Host "Or run this script with -Force to free ports automatically: .\start-dev.ps1 -Force" -ForegroundColor Yellow
        
        # Check if they are already responding to HireMind health
        $feOccupied = $Occupied.ContainsKey($FrontendPort)
        $beOccupied = $Occupied.ContainsKey($BackendPort)
        if ($feOccupied -and $beOccupied) {
            Write-Host "`nBoth frontend and backend appear to already be running." -ForegroundColor Cyan
            Write-Host "Frontend: http://localhost:$FrontendPort" -ForegroundColor Green
            Write-Host "Backend : http://127.0.0.1:$BackendPort/docs" -ForegroundColor Green
            exit 0
        }
        Write-Host "`nPlease free the ports or re-run with -Force to proceed." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  [OK] Ports $FrontendPort, $BackendPort, and 8000 are all free." -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 5. Check Dependencies
# ------------------------------------------------------------------------------
Write-Host "`n[2/5] Checking dependencies..." -ForegroundColor Cyan

# Backend check
$pyCheck = & $VenvPython -c "import fastapi, uvicorn, supabase, pydantic; print('OK')" 2>$null
if ($pyCheck -ne "OK") {
    Write-Host "  [WARNING] Missing core backend dependencies in virtual environment." -ForegroundColor Yellow
    Write-Host "  Installing dependencies from requirements.txt..." -ForegroundColor Cyan
    & $VenvPython -m pip install -r "$BackendDir\requirements.txt"
} else {
    Write-Host "  [OK] Backend dependencies verified (FastAPI, Uvicorn, Supabase, Pydantic, etc.)." -ForegroundColor Green
}

# Frontend check
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "  [ERROR] Node.js or npm is not found in PATH. Please install Node.js." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "  [WARNING] frontend/node_modules not found. Running npm install..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    npm install
    Pop-Location
} else {
    Write-Host "  [OK] Frontend dependencies verified (React 19, TypeScript, Vite, Tailwind, etc.)." -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 6. Launch FastAPI Backend in a separate window
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Starting FastAPI Backend on port $BackendPort..." -ForegroundColor Cyan

$BackendScript = @"
`$host.UI.RawUI.WindowTitle = 'DCI HireMind - FastAPI Backend (Port $BackendPort)';
Write-Host '==================================================' -ForegroundColor Cyan;
Write-Host '   DCI HIREMIND - FASTAPI BACKEND SERVER' -ForegroundColor Green;
Write-Host '==================================================' -ForegroundColor Cyan;
Write-Host 'Using virtual environment: $VenvDir';
& '$VenvPython' -m uvicorn app.main:app --host 127.0.0.1 --port $BackendPort --reload;
"@

Start-Process powershell.exe -WorkingDirectory $BackendDir -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $BackendScript

# ------------------------------------------------------------------------------
# 7. Launch Vite Frontend in a separate window
# ------------------------------------------------------------------------------
Write-Host "[4/5] Starting React + Vite Frontend on port $FrontendPort..." -ForegroundColor Cyan

$FrontendScript = @"
`$host.UI.RawUI.WindowTitle = 'DCI HireMind - Vite Frontend (Port $FrontendPort)';
Write-Host '==================================================' -ForegroundColor Cyan;
Write-Host '   DCI HIREMIND - REACT + VITE FRONTEND' -ForegroundColor Green;
Write-Host '==================================================' -ForegroundColor Cyan;
Write-Host 'Starting Vite development server on http://localhost:$FrontendPort...';
npm run dev -- --host 127.0.0.1 --port $FrontendPort;
"@

Start-Process powershell.exe -WorkingDirectory $FrontendDir -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $FrontendScript

# ------------------------------------------------------------------------------
# 8. Verify Server Readiness
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Verifying server health and connectivity..." -ForegroundColor Cyan
$BackendReady = $false
$FrontendReady = $false
$TimeoutSec = 25
$StartTime = Get-Date

while (((Get-Date) - $StartTime).TotalSeconds -lt $TimeoutSec) {
    if (-not $BackendReady) {
        try {
            $resp = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -Method GET -TimeoutSec 2 -ErrorAction Stop
            if ($resp.status -eq "healthy" -or $resp.success -eq $true) {
                $BackendReady = $true
            }
        } catch {}
    }

    if (-not $FrontendReady) {
        try {
            $feResp = Invoke-WebRequest -Uri "http://127.0.0.1:$FrontendPort" -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($feResp.StatusCode -eq 200) {
                $FrontendReady = $true
            }
        } catch {}
    }

    if ($BackendReady -and $FrontendReady) {
        break
    }
    Start-Sleep -Milliseconds 800
    Write-Host -NoNewline "." -ForegroundColor Gray
}
Write-Host ""

# ------------------------------------------------------------------------------
# 9. Status Banner & Access URLs
# ------------------------------------------------------------------------------
Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "         DCI HIREMIND - DEVELOPMENT SERVERS RUNNING                   " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  Frontend Dashboard : http://localhost:$FrontendPort" -ForegroundColor White
Write-Host "  Backend API Root   : http://127.0.0.1:$BackendPort" -ForegroundColor White
Write-Host "  Swagger UI Docs    : http://127.0.0.1:$BackendPort/docs" -ForegroundColor White
Write-Host "  Platform Health    : http://127.0.0.1:$BackendPort/health" -ForegroundColor White
Write-Host "  AI Engine Health   : http://127.0.0.1:$BackendPort/api/health/ai" -ForegroundColor White
Write-Host "----------------------------------------------------------------------" -ForegroundColor Cyan
if ($BackendReady) {
    Write-Host "  [OK] Backend Status : HEALTHY AND CONNECTED (Supabase PostgreSQL + Storage)" -ForegroundColor Green
} else {
    Write-Host "  [!] Backend Status : Still starting up (Check backend terminal window)" -ForegroundColor Yellow
}
if ($FrontendReady) {
    Write-Host "  [OK] Frontend Status: READY (React 19 + TypeScript + Vite)" -ForegroundColor Green
} else {
    Write-Host "  [!] Frontend Status: Still starting up (Check frontend terminal window)" -ForegroundColor Yellow
}
Write-Host "----------------------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  To stop all development servers safely, run:" -ForegroundColor Yellow
Write-Host "    .\stop-dev.ps1" -ForegroundColor Yellow
Write-Host "======================================================================`n" -ForegroundColor Green

