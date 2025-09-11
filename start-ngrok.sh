#!/bin/bash

echo "🚀 Iniciando ngrok para expor webhook..."
echo "📡 Expondo localhost:3000 para receber webhooks do WhatsApp"
echo ""
echo "ℹ️  Se você não tem ngrok instalado:"
echo "   1. Acesse: https://ngrok.com/download"
echo "   2. Baixe e instale ngrok"
echo "   3. Execute: ngrok config add-authtoken SEU_TOKEN"
echo ""

# Inicia ngrok na porta 3000
npx ngrok http 3000

echo ""
echo "👋 Ngrok encerrado."