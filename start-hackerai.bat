@echo off
title HackerAI Launcher
color 0A

echo ========================================
echo     HACKERAI - LAUNCHER AUTOMATIQUE
echo ========================================
echo.

REM Aller dans le dossier du projet
cd /d C:\Users\cherr\hackerai

REM Vérifier si Convex tourne déjà
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Un processus Node existe deja.
    echo [INFO] On va le tuer pour eviter les conflits...
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo [1/4] Lancement de Convex (backend)...
start "Convex Backend" cmd /k "cd /d C:\Users\cherr\hackerai && npx convex dev"

echo [2/4] Attente 5 secondes que Convex se prepare...
timeout /t 5 /nobreak >nul

echo [3/4] Lancement de Next.js (frontend)...
start "Next.js Frontend" cmd /k "cd /d C:\Users\cherr\hackerai && npm run dev:next"

echo [4/4] Lancement du navigateur...
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo     TOUT EST LANCE !
echo ========================================
echo.
echo Deux fenetres noires sont ouvertes :
echo   - Convex Backend (ne pas fermer)
echo   - Next.js Frontend (ne pas fermer)
echo.
echo Le navigateur va s'ouvrir sur http://localhost:3000
echo.
echo Pour tout arreter, ferme les deux fenetres noires.
echo ========================================
pause