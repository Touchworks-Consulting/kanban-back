# 🌐 Ngrok - Expondo seu Webhook para WhatsApp

## ❓ Por que preciso do Ngrok?

O **WhatsApp Business API** só aceita URLs **HTTPS públicas** para webhooks. Como seu sistema está rodando no `localhost:3000`, você precisa **expor** essa porta publicamente.

## 🚀 Como usar:

### 1. **Instale o Ngrok** (se não tiver):
```bash
# Opção 1: Download direto
# Acesse: https://ngrok.com/download
# Baixe e extraia o executável

# Opção 2: Via npm (global)
npm install -g ngrok

# Opção 3: Via snap (Linux)
sudo snap install ngrok
```

### 2. **Configure sua conta** (necessário):
```bash
# Crie conta em: https://dashboard.ngrok.com/signup
# Pegue seu authtoken em: https://dashboard.ngrok.com/get-started/your-authtoken

# Configure o token:
ngrok config add-authtoken SEU_TOKEN_AQUI
```

### 3. **Execute o Ngrok**:
```bash
# Opção 1: Script que criamos
./start-ngrok.sh

# Opção 2: Comando direto
ngrok http 3000

# Opção 3: Com npx
npx ngrok http 3000
```

### 4. **Copie a URL HTTPS**:
```
Session Status: online
Account: seu-email@gmail.com (Plan: Free)
Version: 3.x.x
Region: United States (us)
Latency: 50ms
Web Interface: http://127.0.0.1:4040

Forwarding: https://abc123-456.ngrok.io -> http://localhost:3000  <-- COPIE ESTA!
```

### 5. **Configure no WhatsApp**:
- **Webhook URL**: `https://abc123-456.ngrok.io/api/webhook/whatsapp`
- **Verify Token**: `webhook_verify_token_123`

## ⚠️ Importante:
- A URL **muda** a cada reinicialização (versão grátis)
- Mantenha o ngrok **rodando** durante os testes
- URLs grátis expiram em **2 horas** de inatividade

## 🎯 Fluxo Completo:
1. **Inicie backend**: `node src/simple-server.js`
2. **Inicie ngrok**: `./start-ngrok.sh`
3. **Copie URL**: Ex: `https://abc123.ngrok.io`
4. **Configure WhatsApp**: Adicione `/api/webhook/whatsapp`
5. **Teste**: Envie mensagem → Veja aparecer no sistema!

## 🚨 Troubleshooting:
```bash
# Se der erro de authtoken:
ngrok config add-authtoken SEU_TOKEN

# Se der erro de porta ocupada:
sudo kill -9 $(lsof -ti:4040)

# Para ver logs em tempo real:
# Acesse: http://localhost:4040
```

## 💡 Dica Pro:
Para URLs **fixas** (que não mudam), considere:
- **Ngrok Pro** ($10/mês)
- **Cloudflare Tunnel** (gratuito)
- **Deploy em servidor** (Heroku, Railway, etc.)