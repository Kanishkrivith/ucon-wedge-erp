@echo off
title UCON Wedge ERP v2 - Online Server Launcher
echo ========================================================
echo   UCON WEDGE ERP v2 - STARTING ONLINE PRODUCTION SERVER
echo ========================================================
echo.

:: 1. Ensure PostgreSQL container is running
echo [1/3] Checking PostgreSQL Database container...
docker start ucon-wedge-postgres >nul 2>&1
timeout /t 2 /nobreak >nul

:: 2. Ensure static assets and start Next.js Production Server
echo [2/3] Verifying static assets and launching Next.js Production Engine on Port 3000...
node scripts\copy-standalone-assets.js >nul 2>&1
set PORT=3000
set NODE_ENV=production
start /b node .next/standalone/server.js > server.log 2>&1

timeout /t 3 /nobreak >nul

:: 3. Launch Cloudflare Tunnel
echo [3/3] Opening Secure Public Online HTTPS Tunnel...
echo.
echo ========================================================
echo   YOUR ERP IS GOING LIVE! CHECK THE URL BELOW:
echo ========================================================
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
pause
