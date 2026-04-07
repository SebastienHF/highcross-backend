@echo off
cd /d "C:\Users\sebas\adviser-workspace"

:: ── Backend (FastAPI on port 8000) ──────────────────────────────────────────
netstat -an 2>nul | find "8000" | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto :check_frontend

start /min "HF Backend" cmd /k "cd /d C:\Users\sebas\adviser-workspace\backend && (if not exist .venv python -m venv .venv) && .venv\Scripts\pip.exe install -q -r requirements.txt && .venv\Scripts\uvicorn.exe main:app --reload --port 8000"
timeout /t 5 /nobreak >nul

:: ── Frontend (Vite on port 5173) ─────────────────────────────────────────────
:check_frontend
netstat -an 2>nul | find "5173" | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto :launch

start /min "HF Dev Server" cmd /k "npm run dev"
timeout /t 5 /nobreak >nul

:: ── Open Chrome app — always runs even if servers failed ─────────────────────
:launch
start "" "C:\Program Files\Google\Chrome\Application\chrome_proxy.exe" --profile-directory=Default --app-id=idemibpphagihbobmgmaojhjfidlfpdl
