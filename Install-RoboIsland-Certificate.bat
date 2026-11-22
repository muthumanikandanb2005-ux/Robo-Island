@echo off
title Trust Robo Island Certificate
echo =======================================================
echo   Installing Robo Island Code Signing Certificate
echo   This ensures Windows recognizes Robo Island Publisher!
echo =======================================================
echo.
cd /d "%~dp0"

echo Importing certificate into Windows Trusted Root & Trusted Publisher...
certutil -addstore -user Root "%~dp0RoboIsland.cer"
certutil -addstore -user TrustedPublisher "%~dp0RoboIsland.cer"

echo.
echo =======================================================
echo   Done! Robo Island is now a trusted Windows publisher!
echo =======================================================
echo.
pause
