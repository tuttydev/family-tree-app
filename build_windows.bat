@echo off
setlocal
cd /d "%~dp0"

echo ================================================
echo   FamilyTree Windows Build
echo   Creator: ALASI OLATUNDE
echo ================================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    set "PY=py"
) else (
    set "PY=python"
)

if not exist ".venv\Scripts\python.exe" (
    echo Creating build environment...
    %PY% -m venv .venv
    if errorlevel 1 goto :error
)

echo Installing build dependencies...
.venv\Scripts\python.exe -m pip install --upgrade pip
if errorlevel 1 goto :error
.venv\Scripts\python.exe -m pip install -r requirements-build.txt
if errorlevel 1 goto :error

echo Cleaning previous build...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

echo Building FamilyTree.exe...
.venv\Scripts\python.exe -m PyInstaller --clean FamilyTree.spec
if errorlevel 1 goto :error

echo.
echo SUCCESS:
echo dist\FamilyTree.exe
echo.
pause
exit /b 0

:error
echo.
echo BUILD FAILED.
pause
exit /b 1
