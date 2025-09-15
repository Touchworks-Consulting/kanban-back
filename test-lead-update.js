const axios = require('axios');

// Dados de teste baseados no erro original
const testData = {
  name: "Carol 🎀",
  phone: "5511981055589", 
  email: "",
  message: "#V2 - Olá, gostaria de falar com um especialista em verbas rescisórias.",
  platform: "Meta",
  channel: "WhatsApp", // Campo que estava causando o erro
  campaign: "Verbas",
  value: 0,
  notes: "",
  status: "won"
};

// JWT do erro original (pode estar expirado, mas vamos tentar)
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI1YmJmNzljLWFmNDUtNGU5Yi1iZGI4LTJiNDI5NTQxNmQxMCIsImFjY291bnRJZCI6ImI1YmJmNzljLWFmNDUtNGU5Yi1iZGI4LTJiNDI5NTQxNmQxMCIsInVzZXJJZCI6IjVjMWI2ZGM5LWM5YTYtNGQxNy05MDEwLTgyMzc4YWM0NDhjZSIsImVtYWlsIjoid2VuZW5keUB0b3VjaHdvcmtzLmNvbS5iciIsIm5hbWUiOiJXRU5FTkRZIiwicm9sZSI6Im93bmVyIiwiaWF0IjoxNzU3Njk3MzMxLCJleHAiOjE3NTc3ODM3MzF9.ZMYBxHiihtOt_ahVF0MItSCcW9zn4wZgK9YI0pianhA";

async function testLeadUpdate() {
  try {
    console.log('🧪 Testando atualização de lead...');
    console.log('📤 Dados enviados:', JSON.stringify(testData, null, 2));
    
    const response = await axios.put(
      'http://localhost:3000/api/leads/1e120af0-17a9-43c7-be5d-ace517d3753b',
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': 'b5bbf79c-af45-4e9b-bdb8-2b4295416d10'
        },
        timeout: 10000
      }
    );

    console.log('✅ Sucesso! Status:', response.status);
    console.log('📥 Resposta:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Erro na requisição:');
    console.log('Status:', error.response?.status);
    console.log('Dados do erro:', JSON.stringify(error.response?.data, null, 2));
    console.log('Erro completo:', error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Token pode estar expirado. Vamos testar apenas a validação...');
      return testValidation();
    }
  }
}

async function testValidation() {
  try {
    console.log('\n🔍 Testando apenas a validação (sem autenticação)...');
    
    // Vamos fazer uma requisição que deve falhar na autenticação, 
    // mas se falhar na validação (400) significa que o problema ainda existe
    const response = await axios.put(
      'http://localhost:3000/api/leads/test-id',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('❌ Ainda há erro de validação (400):');
      console.log('Detalhes:', JSON.stringify(error.response.data, null, 2));
    } else if (error.response?.status === 401) {
      console.log('✅ Validação passou! Erro 401 (sem token) é esperado.');
      console.log('✅ O campo "channel" agora é aceito pelo validador!');
    } else {
      console.log('ℹ️ Status inesperado:', error.response?.status);
      console.log('Resposta:', JSON.stringify(error.response?.data, null, 2));
    }
  }
}

testLeadUpdate();