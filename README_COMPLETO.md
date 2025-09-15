# 🚀 Sistema de Gestão de Leads - CRM Completo

## 📋 Visão Geral

Sistema completo de gestão de leads (CRM) com arquitetura multi-tenant, automações inteligentes e agendamento de tarefas.

## ✨ Características Principais

- **✅ Multi-tenant**: Suporte a múltiplas contas com isolamento de dados
- **✅ Autenticação**: Sistema baseado em email + chave API e JWT tokens
- **✅ Kanban Board**: Gestão visual de leads com colunas customizáveis
- **✅ Dashboard**: Métricas e relatórios de desempenho em tempo real
- **✅ Webhooks**: Recebimento automático de leads de diferentes plataformas
- **✅ Sistema de Tags**: Organização e classificação de leads
- **✅ Detecção de Plataforma**: Identificação automática da origem dos leads
- **🆕 Cron Jobs**: Sistema completo de agendamento de tarefas automáticas
- **🆕 Automações**: Triggers e ações automatizadas baseadas em eventos

## 🏗️ Arquitetura

```
├── Backend (Node.js + Express)
├── Banco de Dados (SQLite + Sequelize)
├── Autenticação (JWT + API Keys)
├── Sistema de Webhooks
├── Engine de Automações
├── Scheduler de Cron Jobs
└── Dashboard com Métricas
```

## 🚀 Status do Sistema

- ✅ **Backend**: 100% implementado e funcional
- ✅ **API REST**: Completa com todos os endpoints
- ✅ **Automações**: Sistema ativo com 4 automações de exemplo
- ✅ **Cron Jobs**: 3 jobs de exemplo configurados
- ✅ **Webhook Detection**: Detecta automaticamente a plataforma de origem
- ✅ **Dashboard**: Métricas em tempo real
- ✅ **Multi-tenant**: Isolamento completo por conta

## 📊 Dados de Exemplo Criados

### 🤖 Automações Ativas
1. **Bem-vindo a Novos Leads** - Email automático para novos leads
2. **Follow-up Leads Qualificados** - Agenda follow-up automático
3. **Alerta Lead Alto Valor** - Notifica equipe sobre leads importantes
4. **Lembrete de Follow-up** - Lembra follow-up em leads inativos

### 📅 Cron Jobs Configurados
1. **Relatório Diário** - Gera relatório às 9h todos os dias
2. **Limpeza de Dados** - Remove leads antigos mensalmente
3. **Backup Semanal** - Backup automático aos domingos

### 🏷️ Tags Disponíveis
- `alto-valor` - Leads de alto potencial
- `enterprise` - Clientes corporativos
- `novo-lead` - Leads recém-criados
- `follow-up` - Necessita acompanhamento
- `qualificado` - Leads validados

### 📋 Colunas Kanban
- Novos Leads
- Qualificados
- Em Contato
- Proposta Enviada
- Fechados
- Perdidos

## 🔗 API Endpoints Principais

### 🔐 Autenticação
```http
POST /api/auth/login
```
**Credenciais padrão:**
- Email: `admin@example.com`
- API Key: `demo-api-key-12345`

### 👥 Leads
```http
GET    /api/leads              # Listar leads
POST   /api/leads              # Criar lead
GET    /api/leads/:id          # Obter lead específico
PUT    /api/leads/:id          # Atualizar lead
DELETE /api/leads/:id          # Deletar lead
```

### 🔗 Webhooks
```http
POST /api/webhooks/lead        # Receber lead via webhook
```

### 📊 Dashboard
```http
GET /api/dashboard             # Métricas completas do sistema
```

### 🆕 Cron Jobs
```http
GET    /api/cron-jobs          # Listar cron jobs
POST   /api/cron-jobs          # Criar cron job
GET    /api/cron-jobs/:id      # Obter cron job específico
PUT    /api/cron-jobs/:id      # Atualizar cron job
DELETE /api/cron-jobs/:id      # Deletar cron job
POST   /api/cron-jobs/:id/run  # Executar manualmente
POST   /api/cron-jobs/:id/toggle # Pausar/ativar
```

### 🆕 Automações
```http
GET    /api/automations        # Listar automações
POST   /api/automations        # Criar automação
GET    /api/automations/:id    # Obter automação específica
PUT    /api/automations/:id    # Atualizar automação
DELETE /api/automations/:id    # Deletar automação
POST   /api/automations/:id/execute # Executar manualmente
POST   /api/automations/:id/toggle  # Pausar/ativar
```

### 📋 Kanban
```http
GET  /api/kanban/columns       # Obter colunas
POST /api/kanban/columns       # Criar coluna
POST /api/kanban/move-lead     # Mover lead entre colunas
```

## 💡 Exemplos de Uso

### 🔐 1. Fazer Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "api_key": "demo-api-key-12345"
  }'
```

### 📊 2. Ver Dashboard
```bash
curl -X GET http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 👥 3. Criar Lead
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "+5511999999999",
    "message": "Interessado no produto",
    "platform": "whatsapp",
    "source_url": "https://wa.me/5511999999999"
  }'
```

### 🔗 4. Receber Lead via Webhook
```bash
curl -X POST http://localhost:3000/api/webhooks/lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos",
    "email": "maria@email.com",
    "phone": "+5511888888888",
    "message": "Vim do Instagram",
    "source_url": "https://instagram.com/perfil"
  }'
```

### 🤖 5. Criar Automação
```bash
curl -X POST http://localhost:3000/api/automations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Qualificação Automática",
    "description": "Qualifica leads do LinkedIn automaticamente",
    "trigger_type": "lead_created",
    "trigger_conditions": {
      "platform": ["linkedin"]
    },
    "actions": [
      {
        "type": "add_tag",
        "config": {
          "tag_name": "linkedin-lead"
        }
      },
      {
        "type": "update_status",
        "config": {
          "status": "qualified"
        }
      }
    ]
  }'
```

### 📅 6. Criar Cron Job
```bash
curl -X POST http://localhost:3000/api/cron-jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Relatório Semanal",
    "description": "Gera relatório toda segunda às 9h",
    "type": "report_generation",
    "cron_expression": "0 9 * * 1",
    "actions": {
      "generate_report": {
        "format": "pdf",
        "include_charts": true
      }
    }
  }'
```

## 🔧 Configuração e Execução

### 📦 1. Instalar Dependências
```bash
npm install
```

### 🗄️ 2. Configurar Banco de Dados
```bash
npm run migrate
npm run seed
```

### 🚀 3. Executar Servidor
```bash
npm run dev
```

### 📊 4. Criar Dados de Exemplo
```bash
node examples.js
```

## 🌐 URLs de Acesso

- **🏠 Health Check**: http://localhost:3000/health
- **📊 Dashboard**: http://localhost:3000/api/dashboard
- **👥 Leads**: http://localhost:3000/api/leads
- **🤖 Automações**: http://localhost:3000/api/automations
- **📅 Cron Jobs**: http://localhost:3000/api/cron-jobs

## 🎯 Funcionalidades Avançadas

### 🔍 Detecção Automática de Plataforma
O sistema detecta automaticamente a plataforma baseado na URL:
- **WhatsApp**: `wa.me`, `api.whatsapp.com`
- **Facebook**: `facebook.com`, `fb.me`
- **Instagram**: `instagram.com`, `instagr.am`
- **LinkedIn**: `linkedin.com`
- **Twitter**: `twitter.com`, `t.co`
- **TikTok**: `tiktok.com`
- **YouTube**: `youtube.com`, `youtu.be`

### 🎯 Sistema de Triggers
As automações podem ser disparadas por:
- **lead_created** - Novo lead criado
- **lead_updated** - Lead atualizado
- **lead_status_changed** - Status alterado
- **tag_added** - Tag adicionada
- **time_based** - Baseado em tempo

### ⚡ Tipos de Ações
As automações podem executar:
- **send_email** - Enviar email
- **add_tag** - Adicionar tag
- **update_status** - Atualizar status
- **move_kanban** - Mover no kanban
- **create_task** - Criar tarefa
- **send_notification** - Enviar notificação

### ⏰ Expressões Cron
```
 ┌───────────── minuto (0 - 59)
 │ ┌───────────── hora (0 - 23)
 │ │ ┌───────────── dia do mês (1 - 31)
 │ │ │ ┌───────────── mês (1 - 12)
 │ │ │ │ ┌───────────── dia da semana (0 - 6)
 │ │ │ │ │
 * * * * *
```

**Exemplos:**
- `0 9 * * *` - Todo dia às 9h
- `0 0 1 * *` - Todo dia 1 do mês
- `*/15 * * * *` - A cada 15 minutos
- `0 9 * * 1` - Toda segunda às 9h

## 📈 Métricas Disponíveis

### 📊 Dashboard Overview
- Total de leads
- Novos leads (hoje/semana/mês)
- Taxa de conversão
- Leads por status
- Leads por plataforma
- Timeline de leads

### 🤖 Métricas de Automação
- Automações ativas
- Total de execuções
- Taxa de sucesso
- Automações mais utilizadas

### 📅 Métricas de Cron Jobs
- Jobs ativos
- Execuções realizadas
- Taxa de sucesso
- Próximas execuções

## 🚀 Próximos Passos Sugeridos

### 🎨 Frontend
- [ ] Interface web responsiva
- [ ] Dashboard interativo
- [ ] Gestão visual de automações
- [ ] Kanban board drag & drop

### 🔔 Notificações
- [ ] Email templates
- [ ] Integração Slack
- [ ] Push notifications
- [ ] SMS notifications

### 📊 Relatórios Avançados
- [ ] Relatórios personalizados
- [ ] Exportação em múltiplos formatos
- [ ] Gráficos avançados
- [ ] Análise de funil

### 🔗 Integrações
- [ ] Zapier
- [ ] Mailchimp
- [ ] HubSpot
- [ ] Salesforce

### 🔒 Segurança
- [ ] Logs de auditoria
- [ ] Controle de acesso por papel
- [ ] Rate limiting
- [ ] Criptografia avançada

### ⚡ Performance
- [ ] Cache Redis
- [ ] Otimização de queries
- [ ] CDN para assets
- [ ] Load balancing

## 🎉 Sistema Pronto para Produção!

O backend está **100% funcional** e pronto para ser integrado com qualquer frontend ou sistema externo. Todas as funcionalidades core estão implementadas e testadas.

### ✅ O que está funcionando:
- ✅ API REST completa
- ✅ Sistema de automações
- ✅ Cron jobs agendados
- ✅ Detecção de plataforma
- ✅ Dashboard com métricas
- ✅ Multi-tenancy
- ✅ Webhook endpoints
- ✅ Sistema de tags
- ✅ Kanban board

### 🔥 Destaques Técnicos:
- **Arquitetura escalável** com padrão MVC
- **Banco de dados normalizado** com relacionamentos
- **Sistema de eventos** para automações
- **Scheduler robusto** para cron jobs
- **API RESTful** bem documentada
- **Tratamento de erros** completo
- **Validação de dados** em todas as camadas

O sistema está pronto para receber leads, executar automações e gerar relatórios!
