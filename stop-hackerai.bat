@echo off
title HackerAI Stopper
color 0C

echo Arret de HackerAI...
taskkill /f /im node.exe >nul 2>&1
echo Fait.
pause