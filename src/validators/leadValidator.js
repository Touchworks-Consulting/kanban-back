const Joi = require('joi');

const createLeadSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      'any.required': 'Nome é obrigatório',
      'string.max': 'Nome deve ter no máximo 255 caracteres'
    }),
  phone: Joi.string()
    .pattern(/^[\d\s\-\+\(\)]+$/)
    .allow('')
    .messages({
      'string.pattern.base': 'Telefone deve conter apenas números e caracteres especiais válidos'
    }),
  email: Joi.string()
    .email()
    .allow('')
    .messages({
      'string.email': 'Email deve ter um formato válido'
    }),
  platform: Joi.string()
    .allow(''),
  campaign: Joi.string()
    .allow(''),
  source_url: Joi.string()
    .uri()
    .allow('')
    .messages({
      'string.uri': 'Source URL deve ser uma URL válida'
    }),
  message: Joi.string()
    .allow(''),
  column_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.uuid': 'ID da coluna deve ser um UUID válido'
    }),
  value: Joi.number()
    .positive()
    .precision(2)
    .allow(null)
    .messages({
      'number.positive': 'Valor deve ser positivo'
    }),
  notes: Joi.string()
    .allow(''),
  tags: Joi.array()
    .items(Joi.string().uuid())
    .default([])
    .messages({
      'string.uuid': 'IDs das tags devem ser UUIDs válidos'
    })
});

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
    .positive()
    .precision(2)
    .allow(null),
  notes: Joi.string()
    .allow(''),
  tags: Joi.array()
    .items(Joi.string().uuid())
});

const validateCreateLead = (req, res, next) => {
  const { error } = createLeadSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }
  
  next();
};

const validateUpdateLead = (req, res, next) => {
  const { error } = updateLeadSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }))
    });
  }
  
  next();
};

module.exports = {
  validateCreateLead,
  validateUpdateLead
};
