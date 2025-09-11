@echo off
echo 🚀 Iniciando PostgreSQL na porta 5433...
echo.

REM Navegar para o diretório do projeto
cd /d "%~dp0"

REM Parar todos os containers relacionados
echo 🛑 Parando containers existentes...
docker-compose down

REM Remover volume para começar limpo
echo 🗑️ Limpando dados antigos...
docker volume rm kanban-touch_postgres_data 2>nul

REM Iniciar PostgreSQL na nova porta
echo 📦 Subindo PostgreSQL na porta 5433...
docker-compose up -d postgres

REM Aguardar inicialização
echo ⏳ Aguardando PostgreSQL inicializar...
timeout /t 20 /nobreak >nul

REM Verificar status
echo 📊 Status dos containers:
docker ps --filter "name=kanban"

echo.
echo ✅ PostgreSQL iniciado na porta 5433!
echo 🔐 Senha: 753951
echo 🔗 Conexão: localhost:5433
echo.
pause