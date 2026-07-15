@echo off
setlocal

set "PROJECT_DIR=%~dp0"

echo ============================================
echo   ArmorStrike - Launcher
echo ============================================
echo.

echo [1/4] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install it from https://nodejs.org/ and run this script again.
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v 2^>nul') do echo   Node.js %%v found.

echo [2/4] Checking npm...
where npm >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] npm is not installed or not in PATH.
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('npm -v 2^>nul') do echo   npm %%v found.

echo [3/4] Checking project directory and dependencies...
if not exist "%PROJECT_DIR%" (
    echo.
    echo [ERROR] Project directory not found: %PROJECT_DIR%
    echo.
    pause
    exit /b 1
)
if not exist "%PROJECT_DIR%package.json" (
    echo.
    echo [ERROR] package.json not found in project directory.
    echo.
    pause
    exit /b 1
)
if not exist "%PROJECT_DIR%node_modules" (
    echo   node_modules not found. Installing dependencies...
    pushd "%PROJECT_DIR%"
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo   Dependencies already installed.
)

echo [4/4] Starting dev server and opening browser...
echo.

pushd "%PROJECT_DIR%"
call npm run dev -- --open
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start the dev server.
    popd
    pause
    exit /b 1
)
popd

endlocal
