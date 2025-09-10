const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório'
    }),
  api_key: Joi.string()
    .min(1)
    .required()
    .messages({
      'any.required': 'Chave API é obrigatória'
    })
});

const validateLogin = (req, res, next) => {
  const { error } = loginSchema.validate(req.body);
  
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
  validateLogin
};
