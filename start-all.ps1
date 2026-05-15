# DKnex AI - Full Stack Startup Script
# Starts all 4 services: Python Agent (:8000), Spring Boot Backend (:8081), Angular Frontend (:4200), Python RAG Agent (:8002)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   DKnex AI - Starting All Services" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot

# 1. Start Python Agent Service (port 8000)
Write-Host "[1/4] Starting Python AI Agent Service on :8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    cd '$rootDir\Agent_chat';
    Write-Host 'Installing Python dependencies...' -ForegroundColor Gray;
    pip install -r requirements.txt -q;
    Write-Host 'Starting Python Agent on http://localhost:8000' -ForegroundColor Green;
    python main.py
" -WindowStyle Normal

Start-Sleep -Seconds 3

# 2. Start Python RAG Agent Service (port 8002)
Write-Host "[2/4] Starting Python RAG Agent Service on :8002..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    cd '$rootDir\New folder';
    Write-Host 'Starting RAG Agent on http://localhost:8002' -ForegroundColor Green;
    .\.venv\Scripts\python.exe -m app.main
" -WindowStyle Normal

Start-Sleep -Seconds 3

# 3. Start Spring Boot Backend (port 8081)
Write-Host "[3/4] Starting Spring Boot Backend on :8081..." -ForegroundColor Yellow
$mvn = "C:\Program Files\Maven\maven-mvnd-1.0.3-windows-amd64\mvn\bin\mvn.cmd"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    cd '$rootDir\BACKEND';
    Write-Host 'Building and starting Spring Boot...' -ForegroundColor Gray;
    & '$mvn' spring-boot:run
" -WindowStyle Normal

Start-Sleep -Seconds 5

# 4. Start Angular Frontend (port 4200)
Write-Host "[4/4] Starting Angular Frontend on :4200..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "
    cd '$rootDir\FRONTEND';
    Write-Host 'Starting Angular dev server...' -ForegroundColor Gray;
    npm run start
" -WindowStyle Normal

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   All services are starting up!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Python Agent:  http://localhost:8000" -ForegroundColor White
Write-Host "  RAG Agent:     http://localhost:8002" -ForegroundColor White
Write-Host "  Backend API:   http://localhost:8081" -ForegroundColor White
Write-Host "  Frontend App:  http://localhost:4200" -ForegroundColor White
Write-Host ""
Write-Host "  API Docs:      http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "  Health Check:  http://localhost:8000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Wait ~30 seconds for all services to fully start." -ForegroundColor Yellow
