@echo off
echo ===================================
echo   KANBAN CRM - Configuracao PostgreSQL
echo ===================================
echo.

echo 1. Instalando dependencias do PostgreSQL...
npm install pg pg-hstore --save
npm uninstall better-sqlite3 --save

echo.
echo 2. Verificando Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker nao encontrado. Instale o Docker Desktop primeiro.
    echo    Download: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo ✅ Docker encontrado!
echo.

echo 3. Iniciando PostgreSQL com Docker...
docker-compose up -d postgres

echo.
echo 4. Aguardando PostgreSQL inicializar...
timeout /t 10 /nobreak >nul

echo.
echo 5. Executando migracoes...
npm run migrate

echo.
echo 6. Executando seed (dados iniciais)...
npm run seed

echo.
echo ===================================
echo   ✅ CONFIGURACAO CONCLUIDA!
echo ===================================
echo.
echo Servicos disponiveis:
echo   - PostgreSQL: localhost:5432
echo   - pgAdmin: http://localhost:8080
echo     Email: admin@kanban.local
echo     Senha: admin123
echo.
echo Para iniciar o servidor:
echo   npm run dev
echo.
pause
