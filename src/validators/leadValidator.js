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
  email: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.string().allow(''),
      Joi.allow(null)
    )
    .optional()
    .messages({
      'string.email': 'Email deve ter um formato válido'
    }),
  platform: Joi.string()
    .allow(''),
  channel: Joi.string()
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
    .precision(2)
    .allow(null, '', 0), // Totalmente opcional
  notes: Joi.string()
    .allow(''),
  tags: Joi.array()
    .items(Joi.string().uuid())
    .default([])
    .messages({
      'string.uuid': 'IDs das tags devem ser UUIDs válidos'
    }),
  assigned_to_user_id: Joi.string()
    .uuid()
    .allow('', null)
    .messages({
      'string.uuid': 'ID do usuário deve ser um UUID válido'
    })
});

const updateLeadSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255),
  phone: Joi.string()
    .pattern(/^[\d\s\-\+\(\)]+$/)
    .allow(''),
  email: Joi.alternatives()
    .try(
      Joi.string().email(),
      Joi.string().allow(''),
      Joi.allow(null)
    )
    .optional(),
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
    .precision(2)
    .allow(null, '', 0), // Totalmente opcional
  notes: Joi.string()
    .allow(''),
  tags: Joi.array()
    .items(Joi.string().uuid()),
  assigned_to_user_id: Joi.string()
    .uuid()
    .allow('', null)
    .messages({
      'string.uuid': 'ID do usuário deve ser um UUID válido'
    })
});

const validateCreateLead = (req, res, next) => {
  const { error } = createLeadSchema.validate(req.body, {
    allowUnknown: true,
    stripUnknown: true
  });

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
  const { error } = updateLeadSchema.validate(req.body, {
    allowUnknown: true,
    stripUnknown: true
  });

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
