const Joi = require('joi');

// Schema atualizado
const updateLeadSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255),
  phone: Joi.string()
    .pattern(/^[\d\s\-\+\(\)]+$/)
    .allow(''),
  email: Joi.string()
    .email()
    .allow(''),
  platform: Joi.string()
    .allow(''),
  channel: Joi.string()
    .allow(''),
  campaign: Joi.string()
    .allow(''),
  source_url: Joi.string()
    .uri()
    .allow(''),
  message: Joi.string()
    .allow(''),
  status: Joi.string()
    .valid('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'),
  column_id: Joi.string()
    .uuid()
    .allow(null),
  position: Joi.number()
    .integer()
    .min(0),
  won_reason: Joi.string()
    .allow(''),
  lost_reason: Joi.string()
    .allow(''),
  value: Joi.number()
    .min(0) // Permitir zero
    .precision(2)
    .allow(null)
    .allow(''), // Permitir string vazia também
  notes: Joi.string()
    .allow(''),
  tags: Joi.array()
    .items(Joi.string().uuid())
});

// Dados do frontend
const testData = {
  name: "Carol 🎀",
  phone: "5511981055589",
  email: "",
  message: "#V2 - Olá, gostaria de falar com um especialista em verbas rescisórias.",
  platform: "Meta",
  channel: "WhatsApp",
  campaign: "Verbas",
  value: 0,
  notes: "",
  status: "won"
};

console.log('Testando validação...');
const { error } = updateLeadSchema.validate(testData);

if (error) {
  console.log('❌ Erro de validação:');
  console.log(error.details.map(detail => ({
    field: detail.path[0],
    message: detail.message
  })));
} else {
  console.log('✅ Validação passou!');
}