@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "PORT=5178"
set "GAME_URL=http://127.0.0.1:%PORT%/"

echo ============================================
echo   ArmorStrike - Launcher
echo ============================================
echo.

echo [1/5] Checking Node.js...
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
rem J13: engines требует 20.19+ для 20.x и 22.12+ для 22.x/23.x+ — gate по major И minor.
for /f "tokens=1,2 delims=." %%M in ('node -p "process.versions.node" 2^>nul') do (
    set "NODE_MAJOR=%%M"
    set "NODE_MINOR=%%N"
)
set "NODE_OK="
rem Пустые значения обнуляем ДО сравнений: cmd раскрывает %VAR% на парсинге, поэтому
rem сравнения — отдельными top-level командами. Внутри скобочных блоков cmd крашится
rem на парсинге, даже если ветка не выполняется, — неэкранированные скобки в echo/rem
rem внутри блоков запрещены.
if not defined NODE_MAJOR set "NODE_MAJOR=0"
if not defined NODE_MINOR set "NODE_MINOR=0"
if %NODE_MAJOR% GTR 22 set "NODE_OK=1"
if %NODE_MAJOR% EQU 22 if %NODE_MINOR% GEQ 12 set "NODE_OK=1"
if %NODE_MAJOR% EQU 20 if %NODE_MINOR% GEQ 19 set "NODE_OK=1"
if not defined NODE_OK (
    echo.
    echo [ERROR] Node.js 20.19+ or 22.12+ required ^(vite 7^). Found %NODE_MAJOR%.%NODE_MINOR%.
    echo Please upgrade from https://nodejs.org/ and run this script again.
    echo.
    pause
    exit /b 1
)

echo [2/5] Checking npm...
where npm >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] npm is not installed or not in PATH.
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('npm -v 2^>nul') do echo   npm %%v found.

echo [3/5] Checking project directory and dependencies...
if not exist "%PROJECT_DIR%package.json" (
    echo.
    echo [ERROR] package.json not found in project directory: %PROJECT_DIR%
    echo.
    pause
    exit /b 1
)
if not exist "%PROJECT_DIR%node_modules" (
    echo   node_modules not found. Installing dependencies...
    pushd "%PROJECT_DIR%"
    if exist package-lock.json (
        call npm ci
    ) else (
        call npm install
    )
    if errorlevel 1 (
        echo.
        echo [ERROR] Dependency install failed.
        popd
        pause
        exit /b 1
    )
    popd
) else (
    echo   Dependencies already installed.
)

rem ---- [4/5] If the dev server is already running, just open the game ----
echo [4/5] Checking for a running dev server on port %PORT%...
netstat -ano | findstr /c:":%PORT% " | findstr /c:"LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo   Dev server already running.
    rem J13: --no-open must be honored here too; previously the browser opened unconditionally.
    if "%~1"=="--no-open" (
        echo   Skipped browser auto-open: --no-open flag. Game: %GAME_URL%
    ) else (
        echo   Opening the game: %GAME_URL%
        start "" "%GAME_URL%"
    )
    goto :end
)
echo   No running server found. A new one will be started.

rem ---- [5/5] Start dev server + open the game in the browser ----
echo [5/5] Starting dev server...
echo   The game will open in your browser automatically.
echo   ^(Use "start.bat --no-open" to skip browser auto-open.^)
echo.

pushd "%PROJECT_DIR%"
if "%~1"=="--no-open" (
    call npm run dev
) else (
    call npm run dev -- --open
)
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start the dev server.
    echo   If the browser did not open, go to %GAME_URL% manually.
    popd
    pause
    exit /b 1
)
popd

:end
echo.
echo Done.
endlocal
