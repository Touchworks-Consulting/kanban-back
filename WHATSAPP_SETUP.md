# 📱 Configuração WhatsApp Business - Guia Rápido

## 🚀 Passos para Testar o Sistema

### 1. Inicie os Serviços
```bash
# Terminal 1 - Backend
cd /mnt/c/Users/wenen/Documents/kanban/kanban-touch
node src/simple-server.js

# Terminal 2 - Frontend  
cd /mnt/c/Users/wenen/Documents/kanban/kanban-touch-front
npm run dev

# Terminal 3 - Ngrok (para expor webhook publicamente)
cd /mnt/c/Users/wenen/Documents/kanban/kanban-touch
./start-ngrok.sh
# Ou se você tem ngrok instalado globalmente:
# npx ngrok http 3000
```

### 🌐 Importante sobre o Ngrok:
- **Para testes reais**: Você PRECISA do ngrok para expor o localhost:3000 publicamente
- **WhatsApp só aceita**: URLs HTTPS públicas para webhooks  
- **A URL muda**: A cada reinicialização do ngrok (versão gratuita)
- **URL exemplo**: `https://abc123.ngrok.io/api/webhook/whatsapp`

### 2. Configure no Sistema
1. Acesse: `http://localhost:5173/settings` (aba WhatsApp)
2. Clique em "Nova Conta"
3. Preencha apenas:
   - **Phone ID**: Obtido no Facebook Developer Console
   - **Nome da Conta**: Nome para identificar (ex: "Empresa Principal")  
   - **Telefone**: Número WhatsApp Business (ex: "+5511999999999")

### 3. Configure no Facebook Developer Console
1. Acesse: https://developers.facebook.com/apps
2. Selecione seu app WhatsApp Business
3. Vá em "WhatsApp" > "Configuration"
4. Configure o Webhook:
   - **Callback URL**: Use a URL que aparece no ngrok + `/api/webhook/whatsapp`
   - **Verify Token**: `webhook_verify_token_123`
   - Subscreva em "messages"

### 4. Teste o Sistema
1. Envie mensagens para o número configurado
2. Verifique os logs em tempo real no sistema
3. Veja os leads sendo criados automaticamente no Kanban

## 🔧 Configuração de Campanhas
1. Acesse `http://localhost:5173/campaigns`
2. Configure frases gatilho para suas campanhas
3. As mensagens serão automaticamente categorizadas

## ✅ O que Mudou
- **Simplificado**: Apenas Phone ID, Nome e Telefone necessários
- **Automático**: Webhook e tokens são gerenciados internamente
- **Integrado**: Configuração dentro de Settings > WhatsApp
- **Logs em Tempo Real**: Acompanhe todos os eventos

## 🎯 Dados Necessários
Para funcionar, você precisa apenas do **Phone ID** do Facebook Developer Console. Todo o resto é automático!

## 🔍 Debug
- Logs do servidor: Veja o terminal do backend
- Logs de webhook: Use o botão "Logs" na interface  
- Teste webhook: Use o botão "Testar" na conta