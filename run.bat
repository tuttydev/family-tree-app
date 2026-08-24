@echo off
setlocal
cd /d "%~dp0"

echo.
echo ================================================
echo   FamilyTree - ALASI OLATUNDE
echo ================================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON=py"
) else (
    where python >nul 2>nul
    if errorlevel 1 (
        echo Python 3 is required. Install Python 3.10+ and run this file again.
        pause
        exit /b 1
    )
    set "PYTHON=python"
)

if not exist "backend\.venv\Scripts\python.exe" (
    echo Creating application environment...
    %PYTHON% -m venv backend\.venv
    if errorlevel 1 goto :error
)

echo Installing/verifying backend dependencies...
echo Using prebuilt Windows wheels to avoid requiring Microsoft C++ Build Tools.
backend\.venv\Scripts\python.exe -m pip install --disable-pip-version-check --upgrade pip
if errorlevel 1 goto :error
backend\.venv\Scripts\python.exe -m pip install --disable-pip-version-check --only-binary=:all: -r backend\requirements.txt
if errorlevel 1 goto :error

echo Starting FamilyTree...
start "FamilyTree Server" /min backend\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8000'"

echo.
echo FamilyTree is running at http://127.0.0.1:8000
echo Close the server window to stop the application.
echo.
pause
exit /b 0

:error
echo.
echo FamilyTree could not start. Read the error above, then try again.
pause
exit /b 1
