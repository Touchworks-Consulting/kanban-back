# 🚀 Migração para PostgreSQL

Este documento descreve a migração do SQLite para PostgreSQL, tornando o sistema muito mais robusto e adequado para produção.

## 🎯 Benefícios da Migração

### **Antes (SQLite)**
- ❌ Banco de arquivo único
- ❌ Problemas de concorrência
- ❌ Limitações de performance
- ❌ Não adequado para produção
- ❌ Sem replicação nativa

### **Depois (PostgreSQL)**
- ✅ Banco de dados robusto
- ✅ Excelente para concorrência
- ✅ Alta performance
- ✅ Pronto para produção
- ✅ Replicação e backup avançados
- ✅ Extensões poderosas
- ✅ ACID completo

## 🛠️ Instalação Rápida

### **Opção 1: Automática (Recomendada)**

**Windows:**
```bash
cd kanban-touch
.\scripts\setup-windows.bat
```

**Linux/Mac:**
```bash
cd kanban-touch
chmod +x scripts/setup-unix.sh
./scripts/setup-unix.sh
```

### **Opção 2: Manual**

1. **Instalar dependências:**
```bash
npm install pg pg-hstore --save
npm uninstall better-sqlite3 --save
```

2. **Iniciar PostgreSQL:**
```bash
docker-compose up -d postgres
```

3. **Executar migrações:**
```bash
npm run migrate
npm run seed
```

## 🐳 Docker Services

O projeto agora inclui:

- **PostgreSQL 15**: `localhost:5432`
- **pgAdmin 4**: `http://localhost:8080`
  - Email: `admin@kanban.local`
  - Senha: `admin123`

## ⚙️ Configuração

### **Variáveis de Ambiente (.env)**
```env
# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kanban_crm
DB_USER=postgres
DB_PASSWORD=postgres
```

### **Customização para Produção**
```env
# Produção
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=kanban_crm_prod
DB_USER=kanban_user
DB_PASSWORD=your_secure_password_here
```

## 📊 Scripts Disponíveis

```bash
# Iniciar banco
npm run db:up

# Parar banco
npm run db:down

# Reset completo (CUIDADO: apaga dados!)
npm run db:reset

# Migração manual
npm run migrate

# Dados iniciais
npm run seed
```

## 🔧 Desenvolvimento

### **Iniciar Ambiente Completo**
```bash
# Terminal 1: Banco
npm run db:up

# Terminal 2: Backend
npm run dev

# Terminal 3: Frontend
cd ../kanban-touch-front
npm run dev
```

## 🚨 Migração de Dados Existentes

Se você tinha dados importantes no SQLite, você pode criar um script de migração personalizado:

```javascript
// scripts/migrate-from-sqlite.js
const sqlite3 = require('sqlite3');
const { sequelize } = require('../src/database/connection');
const models = require('../src/models');

async function migrateSQLiteData() {
  // Script personalizado para migrar dados específicos
  // Implementar conforme necessário
}
```

## 🎉 Vantagens Técnicas

### **Performance**
- Queries complexas muito mais rápidas
- Índices avançados
- Paralelização nativa

### **Escalabilidade**
- Suporte a milhões de registros
- Conexões simultâneas
- Particionamento de tabelas

### **Recursos Avançados**
- JSON nativo
- Full-text search
- Arrays e tipos customizados
- Procedures e triggers

### **Produção**
- Backup incremental
- Replicação master-slave
- Monitoring avançado
- Alta disponibilidade

## 🏆 Resultado

Agora seu sistema está pronto para:
- **Milhares de usuários simultâneos**
- **Milhões de leads**
- **Relatórios complexos em tempo real**
- **Integração com ferramentas enterprise**
- **Deploy em qualquer cloud**

---

**Seu CRM agora é enterprise-ready! 🚀**
