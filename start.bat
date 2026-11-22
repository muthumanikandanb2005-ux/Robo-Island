@echo off
title Windows Dynamic Island
cd /d "%~dp0"
echo Starting Windows Dynamic Island...
start "" npx electron .
exit
