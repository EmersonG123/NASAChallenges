@echo off
REM Starts the ASTRA backend (behavior model on :8000) and the frontend (Next.js + Bun on :3000).
cd /d "%~dp0"
start "ASTRA API" cmd /k "cd backend && python -m uvicorn main:app --port 8000"
cd frontend
start "" http://localhost:3000
bun run dev
