@echo off
REM Soccer Management Server Management Script for Windows
REM Usage: manage-servers.bat [start|stop|restart|status]

setlocal enabledelayedexpansion

set BACKEND_PORT=3000
set FRONTEND_PORT=8000

if "%1"=="" (
    echo No command specified
    goto :usage
)

if "%1"=="start" goto :start
if "%1"=="stop" goto :stop
if "%1"=="restart" goto :restart
if "%1"=="status" goto :status
if "%1"=="help" goto :usage

echo Unknown command: %1
goto :usage

:start
echo Starting servers...
echo Starting backend server...
start /B node server.js
timeout /t 2 /nobreak >nul
echo Starting frontend server...
start /B python -m http.server %FRONTEND_PORT%
echo Servers started!
echo Backend: http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%
goto :end

:stop
echo Stopping servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%BACKEND_PORT%"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%FRONTEND_PORT%"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Servers stopped!
goto :end

:restart
call :stop
timeout /t 2 /nobreak >nul
call :start
goto :end

:status
echo Checking server status...
netstat -an | findstr ":%BACKEND_PORT%" >nul
if !errorlevel! equ 0 (
    echo Backend server is running on port %BACKEND_PORT%
) else (
    echo Backend server is not running
)
netstat -an | findstr ":%FRONTEND_PORT%" >nul
if !errorlevel! equ 0 (
    echo Frontend server is running on port %FRONTEND_PORT%
) else (
    echo Frontend server is not running
)
goto :end

:usage
echo Soccer Management Server Management Script
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   start    - Start both backend and frontend servers
echo   stop     - Stop both servers
echo   restart  - Stop and start both servers
echo   status   - Check server status
echo   help     - Show this help message
echo.
echo Servers:
echo   Backend:  Node.js server on port %BACKEND_PORT%
echo   Frontend: Python HTTP server on port %FRONTEND_PORT%
echo.

:end