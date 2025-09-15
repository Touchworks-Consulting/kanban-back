# API Documentation - Leads CRM

## Visão Geral

Esta é a documentação da API REST para o sistema de gestão de leads. A API utiliza autenticação por JWT tokens para operações gerais e chaves API para webhooks.

## Base URL

```
http://localhost:3000/api
```

## Autenticação

### JWT Token
Para a maioria dos endpoints, utilize Bearer Token:
```
Authorization: Bearer <jwt_token>
```

### API Key
Para webhooks, utilize header personalizado:
```
X-API-Key: <api_key>
```

## Endpoints

### 🔐 Autenticação

#### POST /auth/login
Fazer login com email e chave API.

**Request:**
```json
{
  "email": "admin@example.com",
  "api_key": "demo_api_key_change_me"
}
```

**Response:**
```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "account": {
    "id": "uuid",
    "name": "Conta Demonstração",
    "email": "admin@example.com",
    "settings": {}
  }
}
```

#### POST /auth/refresh
Renovar token JWT.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Token renovado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /auth/verify
Verificar se token é válido.

**Headers:** `Authorization: Bearer <token>`

### 📊 Dashboard

#### GET /dashboard
Obter dados completos do dashboard.

**Query Parameters:**
- `start_date`: Data inicial (YYYY-MM-DD)
- `end_date`: Data final (YYYY-MM-DD)
- `timeframe`: week|month|year (para timeline)

**Response:**
```json
{
  "dashboard": {
    "metrics": {
      "totalLeads": 150,
      "recentLeads": 25,
      "wonLeads": 45,
      "lostLeads": 30,
      "conversionRate": 30.0,
      "totalValue": 125000.50,
      "leadsByStatus": [...],
      "leadsByPlatform": [...]
    },
    "funnel": [...],
    "timeline": {...}
  }
}
```

#### GET /dashboard/metrics
Métricas gerais do dashboard.

#### GET /dashboard/funnel
Funil de conversão.

#### GET /dashboard/timeline
Timeline de leads por período.

### 👥 Leads

#### GET /leads
Listar leads com filtros e paginação.

**Query Parameters:**
- `page`: Página (padrão: 1)
- `limit`: Itens por página (padrão: 20)
- `status`: Filtrar por status
- `platform`: Filtrar por plataforma
- `search`: Busca por nome, telefone, email
- `column_id`: Filtrar por coluna

**Response:**
```json
{
  "leads": [
    {
      "id": "uuid",
      "name": "João Silva",
      "phone": "(11) 99999-9999",
      "email": "joao@example.com",
      "platform": "facebook",
      "campaign": "Curso Online",
      "status": "new",
      "column": {
        "id": "uuid",
        "name": "Leads Entrantes",
        "color": "#3b82f6"
      },
      "tags": [...]
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

#### GET /leads/:id
Obter lead específico por ID.

#### POST /leads
Criar novo lead.

**Request:**
```json
{
  "name": "João Silva",
  "phone": "(11) 99999-9999",
  "email": "joao@example.com",
  "platform": "facebook",
  "campaign": "Curso Online",
  "message": "Interessado no curso",
  "tags": ["tag-uuid-1", "tag-uuid-2"]
}
```

#### PUT /leads/:id
Atualizar lead existente.

#### DELETE /leads/:id
Deletar lead.

#### PATCH /leads/:id/move
Mover lead para outra coluna.

**Request:**
```json
{
  "column_id": "uuid",
  "position": 0
}
```

### 📋 Kanban

#### GET /kanban/board
Obter board completo com colunas e leads.

**Response:**
```json
{
  "board": {
    "columns": [
      {
        "id": "uuid",
        "name": "Leads Entrantes",
        "position": 0,
        "color": "#3b82f6",
        "is_system": true,
        "leads": [...]
      }
    ]
  }
}
```

#### GET /kanban/columns
Listar colunas do kanban.

#### POST /kanban/columns
Criar nova coluna.

**Request:**
```json
{
  "name": "Nova Coluna",
  "color": "#10b981"
}
```

#### PUT /kanban/columns/:id
Atualizar coluna.

#### DELETE /kanban/columns/:id
Deletar coluna (não permite colunas do sistema).

#### PATCH /kanban/columns/reorder
Reordenar colunas.

**Request:**
```json
{
  "columnOrders": [
    { "id": "uuid1", "position": 0 },
    { "id": "uuid2", "position": 1 }
  ]
}
```

### 🔗 Webhooks

#### POST /webhooks/lead
Receber lead via webhook.

**Headers:** `X-API-Key: <api_key>`

**Request:**
```json
{
  "name": "João Silva",
  "phone": "(11) 99999-9999",
  "email": "joao@example.com",
  "message": "Interessado no curso",
  "source_url": "https://facebook.com/ads/...",
  "campaign": "Curso Online",
  "metadata": {
    "custom_field": "value"
  }
}
```

#### GET /webhooks/test
Testar webhook (verificar se API key está funcionando).

**Headers:** `X-API-Key: <api_key>`

## Status Codes

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos
- `401` - Não autorizado
- `403` - Acesso negado
- `404` - Não encontrado
- `409` - Conflito (já existe)
- `500` - Erro interno do servidor

## Detecção de Plataforma

A API detecta automaticamente a plataforma de origem do lead através de:

1. **URL de origem**: Analisa `source_url` para identificar Facebook, Instagram, Google, etc.
2. **Frases configuradas**: Busca frases específicas na mensagem baseado nas configurações da conta.

### Plataformas Suportadas

- Facebook (`facebook`)
- Instagram (`instagram`) 
- Google (`google`)
- YouTube (`youtube`)
- LinkedIn (`linkedin`)
- TikTok (`tiktok`)
- WhatsApp (`whatsapp`)
- Desconhecido (`unknown`)

## Exemplo de Uso

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","api_key":"demo_api_key_change_me"}'
```

### 2. Obter Dashboard
```bash
curl -X GET http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer <token>"
```

### 3. Criar Lead
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"João Silva","phone":"11999999999","platform":"facebook"}'
```

### 4. Webhook
```bash
curl -X POST http://localhost:3000/api/webhooks/lead \
  -H "X-API-Key: demo_api_key_change_me" \
  -H "Content-Type: application/json" \
  -d '{"name":"Lead do Facebook","message":"Interessado no produto"}'
```

## Credenciais Padrão

- **Email**: admin@example.com
- **API Key**: demo_api_key_change_me

⚠️ **IMPORTANTE**: Altere essas credenciais em produção!
