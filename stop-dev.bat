@echo off
REM ==============================================================================
REM DCI HireMind - Stop Development Servers Batch Wrapper
REM ==============================================================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-dev.ps1" %*

