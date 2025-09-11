# 🧪 Teste Local (Sem WhatsApp Real)

Enquanto resolve o ngrok, você pode testar toda a funcionalidade localmente:

## 🚀 Como testar:

### 1. Inicie apenas o sistema:
```bash
# Terminal 1 - Backend
cd /mnt/c/Users/wenen/Documents/kanban/kanban-touch
node src/simple-server.js

# Terminal 2 - Frontend
cd /mnt/c/Users/wenen/Documents/kanban/kanban-touch-front
npm run dev
```

### 2. Configure uma conta WhatsApp:
- Acesse: http://localhost:5173/settings (aba WhatsApp)
- Phone ID: `123456789` (qualquer número para teste)
- Nome: `Teste Local`
- Telefone: `+5511999999999`

### 3. Configure campanhas:
- Acesse: http://localhost:5173/campaigns
- Crie campanhas com frases gatilho

### 4. Teste o webhook manualmente:
```bash
# Simule uma mensagem do WhatsApp:
curl -X POST http://localhost:3000/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123456789",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "+5511999999999",
            "phone_number_id": "123456789"
          },
          "messages": [{
            "from": "5511888888888",
            "id": "msg_123",
            "timestamp": "1635174240",
            "text": { "body": "quero saber mais sobre o produto" },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

### 5. Veja o lead aparecer:
- Vá para: http://localhost:5173/kanban  
- O lead deve aparecer automaticamente!

## ✅ Funciona localmente:
- ✅ Processamento de webhook
- ✅ Matching de frases  
- ✅ Criação de leads
- ✅ Logs em tempo real
- ✅ Interface completa

## 📱 Para WhatsApp real:
- Você precisa resolver o ngrok primeiro
- Ou usar um serviço alternativo como Cloudflare Tunnel