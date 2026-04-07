# Highcross Financial — Adviser Workspace launcher
# Starts the FastAPI backend + Vite frontend (if not already running) then opens the app

$workDir  = "C:\Users\sebas\adviser-workspace"
$backDir  = "$workDir\backend"
$frontUrl = "http://localhost:5173"
$backUrl  = "http://localhost:8000/health"

function Is-Listening($url) {
    try { $null = Invoke-WebRequest -Uri $url -TimeoutSec 2 -ErrorAction Stop; return $true }
    catch { return $false }
}

# ── Backend ───────────────────────────────────────────────────────────────────
if (-not (Is-Listening $backUrl)) {
    # First-run: create venv and install deps
    if (-not (Test-Path "$backDir\.venv")) {
        Write-Host "Setting up Python environment (first run)..."
        Push-Location $backDir
        python -m venv .venv
        & ".venv\Scripts\pip.exe" install -q -r requirements.txt
        Pop-Location
    }

    Write-Host "Starting FastAPI backend..." -NoNewline
    Start-Process "cmd.exe" -ArgumentList "/k `"cd /d $backDir && .venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000`"" -WindowStyle Minimized

    $waited = 0
    while ($waited -lt 30) {
        Start-Sleep -Seconds 1; $waited++
        Write-Host "." -NoNewline
        if (Is-Listening $backUrl) { break }
    }
    Write-Host ""
}

# ── Frontend ──────────────────────────────────────────────────────────────────
if (-not (Is-Listening $frontUrl)) {
    Write-Host "Starting Vite frontend..." -NoNewline
    Start-Process "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $workDir -WindowStyle Minimized

    $waited = 0
    while ($waited -lt 30) {
        Start-Sleep -Seconds 1; $waited++
        Write-Host "." -NoNewline
        if (Is-Listening $frontUrl) { break }
    }
    Write-Host ""
}

# ── Open Chrome app ───────────────────────────────────────────────────────────
& "C:\Program Files\Google\Chrome\Application\chrome_proxy.exe" `
    --profile-directory=Default `
    --app-id=idemibpphagihbobmgmaojhjfidlfpdl
