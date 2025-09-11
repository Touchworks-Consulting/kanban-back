@echo off
echo 🚀 Iniciando PostgreSQL para CRM Kanban...
echo.

REM Navegar para o diretório do projeto
cd /d "%~dp0"

REM Iniciar PostgreSQL
echo 📦 Subindo container PostgreSQL...
docker-compose up -d postgres

REM Aguardar um pouco para o container inicializar
echo ⏳ Aguardando PostgreSQL inicializar...
timeout /t 10 /nobreak >nul

REM Verificar status
echo 📊 Status dos containers:
docker ps --filter "name=kanban"

echo.
echo ✅ PostgreSQL iniciado com sucesso!
echo 🔗 Conexão: localhost:5432
echo 📊 pgAdmin: http://localhost:8080 (admin@kanban.local / admin123)
echo.
pause