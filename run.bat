@echo off
title GitHub Knowledge Assistance (GKA) Runner
echo ========================================================
echo   Starting GitHub Knowledge Assistance (GKA)
echo ========================================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.

cd /d "%~dp0"

echo [1/2] Starting FastAPI backend on port 8000...
start "GKA Backend API" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Vite React frontend on port 5173...
start "GKA Frontend UI" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 0.0.0.0 --port 5173"

timeout /t 3 >nul
echo Opening application in browser...
start http://localhost:5173

echo.
echo Application is running!
echo Close the two opened server terminal windows to stop.
