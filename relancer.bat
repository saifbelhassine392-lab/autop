@echo off
echo ==========================================
echo RECOMPILATION ET REDEMARRAGE DU SERVEUR
echo ==========================================
echo.
echo [1/2] Compilation en cours (Veuillez patienter)...
call npm run build
if errorlevel 1 goto error
echo.
echo [2/2] Demarrage du serveur...
call npm run start
goto end
:error
echo.
echo Une erreur est survenue pendant la compilation !
pause
:end
