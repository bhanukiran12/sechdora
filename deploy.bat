@echo off
REM Schedora Deployment Script for Windows
REM Usage: deploy.bat [dev^|prod^|stop^|init]

echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed. Install from https://docs.docker.com/get-docker/
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose is not installed.
    pause
    exit /b 1
)

set ENV_FILE=.env
set COMPOSE_FILE=docker-compose.yml

if "%1"=="init" goto init
if "%1"=="dev" goto dev
if "%1"=="prod" goto prod
if "%1"=="stop" goto stop

echo Usage: %0 {dev^|prod^|stop^|init}
echo   dev   - Start development stack
echo   prod  - Start production stack (with resource limits)
echo   stop  - Stop all services
echo   init  - Create .env from template
goto end

:init
if not exist "%ENV_FILE%" (
    copy .env.example .env
    echo .env created. Please edit it with your API keys and settings.
    echo Minimum required: JWT_SECRET, RESEND_API_KEY, GEMINI_API_KEY
) else (
    echo .env already exists.
)
goto end

:dev
if not exist "%ENV_FILE%" (
    echo ERROR: .env not found. Run '%0 init' first.
    pause
    exit /b 1
)

echo Starting development deployment...
docker-compose up -d
echo.
echo ================================
echo Services started successfully!
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo ================================
echo.
echo View logs: docker-compose logs -f
goto end

:prod
if not exist "%ENV_FILE%" (
    echo ERROR: .env not found. Run '%0 init' first.
    pause
    exit /b 1
)

echo Starting production deployment...
if exist docker-compose.prod.yml (
    docker-compose -f docker-compose.prod.yml up -d
    echo.
    echo ================================
    echo Production services started!
    echo ================================
) else (
    echo ERROR: docker-compose.prod.yml not found
)
goto end

:stop
echo Stopping services...
docker-compose down
echo Services stopped.
goto end

:end
