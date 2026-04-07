@echo off
cd /d "%~dp0"

if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo Installing dependencies...
pip install -q -r requirements.txt

echo.
echo Starting FastAPI backend on http://localhost:8000
echo.
uvicorn main:app --reload --port 8000
