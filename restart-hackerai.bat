@echo off
title HackerAI Restart
color 0E

echo ========================================
echo     HACKERAI - REDEMARRAGE AUTOMATIQUE
echo ========================================
echo.

echo [1/5] Arret de tous les processus Node...
taskkill /f /im node.exe >nul 2>&1
echo       Fait.

echo [2/5] Attente 3 secondes...
timeout /t 3 /nobreak >nul

echo [3/5] Lancement de Convex (backend)...
start "Convex Backend" cmd /k "cd /d C:\Users\cherr\hackerai && npx convex dev"

echo [4/5] Attente 5 secondes que Convex se prepare...
timeout /t 5 /nobreak >nul

echo [5/5] Lancement de Next.js (frontend)...
start "Next.js Frontend" cmd /k "cd /d C:\Users\cherr\hackerai && npm run dev:next"

echo.
echo Lancement du navigateur...
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo     REDEMARRAGE TERMINE !
echo ========================================
echo.
echo Deux fenetres noires sont ouvertes :
echo   - Convex Backend
echo   - Next.js Frontend
echo.
echo Pour tout arreter, ferme les deux fenetres.
echo ========================================
pause