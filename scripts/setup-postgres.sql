-- Script para configuração inicial do PostgreSQL
-- Execute este script como superusuário do PostgreSQL

-- Criar banco de dados
CREATE DATABASE kanban_crm;

-- Criar usuário (opcional - pode usar postgres padrão)
-- CREATE USER kanban_user WITH PASSWORD 'your_secure_password';

-- Conceder permissões
-- GRANT ALL PRIVILEGES ON DATABASE kanban_crm TO kanban_user;

-- Conectar ao banco e criar extensões úteis
\c kanban_crm;

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensão para full text search (útil para pesquisas)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Mostrar informações do banco
SELECT 
    current_database() as database_name,
    current_user as current_user,
    version() as postgresql_version;
