@echo off
REM ==============================================================================
REM DCI HireMind - Full Stack Development Server Batch Wrapper
REM ==============================================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1" %*

