const ngrok = require('@ngrok/ngrok');

async function startNgrok() {
  try {
    console.log('🚀 Iniciando ngrok para expor webhook...');
    
    // Conecta ao ngrok
    const listener = await ngrok.forward({ 
      addr: 3000, 
      authtoken_from_env: true 
    });
    
    const url = listener.url();
    console.log('✅ Ngrok conectado!');
    console.log(`📡 URL pública: ${url}`);
    console.log(`🔗 Webhook URL: ${url}/api/webhook/whatsapp`);
    console.log(`🔍 Verificação: ${url}/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=webhook_verify_token_123&hub.challenge=test`);
    console.log('');
    console.log('📋 Configuração no Facebook Developer:');
    console.log(`   • Callback URL: ${url}/api/webhook/whatsapp`);
    console.log(`   • Verify Token: webhook_verify_token_123`);
    console.log('');
    console.log('⚡ Pressione Ctrl+C para parar o ngrok');
    
    // Mantém o processo rodando
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Erro ao iniciar ngrok:', error.message);
    
    if (error.message.includes('authtoken')) {
      console.log('');
      console.log('🔐 Para usar ngrok, você precisa de um token:');
      console.log('1. Acesse: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('2. Copie seu authtoken');
      console.log('3. Execute: npx ngrok config add-authtoken SEU_TOKEN_AQUI');
      console.log('4. Ou defina a variável: export NGROK_AUTHTOKEN=SEU_TOKEN_AQUI');
    }
    
    process.exit(1);
  }
}

// Gerencia Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Parando ngrok...');
  process.exit(0);
});

startNgrok();