@echo off
echo 🔄 Reiniciando PostgreSQL com senha correta...
echo.

REM Navegar para o diretório do projeto
cd /d "%~dp0"

REM Parar container existente
echo 🛑 Parando PostgreSQL...
docker-compose down postgres

REM Remover volume para recriar com senha nova
echo 🗑️ Limpando dados antigos...
docker volume rm kanban-touch_postgres_data 2>nul

REM Iniciar novamente
echo 🚀 Iniciando PostgreSQL com nova configuração...
docker-compose up -d postgres

REM Aguardar inicialização
echo ⏳ Aguardando PostgreSQL inicializar...
timeout /t 15 /nobreak >nul

REM Verificar status
echo 📊 Status dos containers:
docker ps --filter "name=kanban"

echo.
echo ✅ PostgreSQL reiniciado com sucesso!
echo 🔐 Senha configurada: 753951
echo 🔗 Conexão: localhost:5432
echo.
pause