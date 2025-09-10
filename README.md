# Sistema de Gestão de Leads (CRM)

Um sistema completo de gestão de leads com kanban boards, dashboard, métricas e automações.

## Funcionalidades Principais

### 🏢 Multi-Tenant
- Suporte a múltiplas contas
- Autenticação por email + chave API
- Isolamento de dados por conta

### 📊 Dashboard
- Volume de leads por plataforma
- Métricas de conversão
- Relatórios em tempo real
- Indicadores de ganhos/perdas

### 📋 Kanban Board
- Colunas customizáveis por conta
- Coluna automática "Leads Entrantes"
- Cards com nome, telefone, plataforma e campanha
- Sistema de tags

### 🔗 Webhooks
- Recebimento automático de leads
- Detecção de plataforma por source_url
- Configuração de frases para identificação
- Suporte a Meta (Facebook/Instagram), Google, etc.

### 📈 Relatórios
- Análise de performance por campanha
- Motivos de ganhos/perdas
- Métricas temporais
- Exportação de dados

## Tecnologias

- **Backend**: Node.js + Express
- **Banco**: SQLite + Sequelize
- **Autenticação**: JWT + API Keys
- **Validação**: Joi + Express Validator
- **Documentação**: Swagger/OpenAPI

## Instalação

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Executar migrações
npm run migrate

# Executar seeds (opcional)
npm run seed

# Iniciar desenvolvimento
npm run dev

# Iniciar produção
npm start
```

## Configuração

Crie um arquivo `.env` baseado no `.env.example`:

```env
NODE_ENV=development
PORT=3000
DB_PATH=./database.sqlite
JWT_SECRET=your_jwt_secret_here
API_RATE_LIMIT=100
WEBHOOK_SECRET=your_webhook_secret
```

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login com email + API key
- `POST /api/auth/refresh` - Renovar token

### Leads
- `GET /api/leads` - Listar leads
- `POST /api/leads` - Criar lead
- `PUT /api/leads/:id` - Atualizar lead
- `DELETE /api/leads/:id` - Deletar lead

### Kanban
- `GET /api/kanban/columns` - Listar colunas
- `POST /api/kanban/columns` - Criar coluna
- `PUT /api/kanban/columns/:id` - Atualizar coluna
- `DELETE /api/kanban/columns/:id` - Deletar coluna

### Dashboard
- `GET /api/dashboard/metrics` - Métricas gerais
- `GET /api/dashboard/leads-by-platform` - Leads por plataforma
- `GET /api/dashboard/conversion-funnel` - Funil de conversão

### Webhooks
- `POST /api/webhooks/lead` - Receber lead via webhook

## Estrutura do Projeto

```
src/
├── controllers/     # Controladores da API
├── middleware/      # Middlewares personalizados
├── models/         # Modelos do banco de dados
├── routes/         # Rotas da API
├── services/       # Lógica de negócio
├── utils/          # Utilitários
├── database/       # Migrações e seeds
├── validators/     # Validadores de entrada
└── server.js       # Ponto de entrada
```

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

MIT License
