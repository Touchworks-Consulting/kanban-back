const { body, param } = require('express-validator');

const leadModalValidation = {
  // Validação para UUID de lead
  validateLeadId: param('leadId')
    .isUUID(4)
    .withMessage('ID do lead deve ser um UUID válido'),

  // Validação para adicionar atividade
  addActivity: [
    body('type')
      .isIn(['call', 'email', 'whatsapp', 'meeting', 'note', 'task', 'follow_up'])
      .withMessage('Tipo de atividade inválido'),

    body('title')
      .isLength({ min: 1, max: 255 })
      .withMessage('Título é obrigatório e deve ter no máximo 255 caracteres')
      .trim()
      .escape(),

    body('description')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Descrição deve ter no máximo 2000 caracteres')
      .trim(),

    body('duration_minutes')
      .optional()
      .isInt({ min: 1, max: 1440 })
      .withMessage('Duração deve ser entre 1 e 1440 minutos (24 horas)'),

    body('scheduled_for')
      .optional()
      .isISO8601()
      .withMessage('Data agendada deve estar no formato ISO8601'),

    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata deve ser um objeto JSON válido')
  ],

  // Validação para adicionar contato
  addContact: [
    body('type')
      .isIn(['phone', 'email'])
      .withMessage('Tipo de contato deve ser phone ou email'),

    body('value')
      .notEmpty()
      .withMessage('Valor do contato é obrigatório')
      .trim()
      .custom((value, { req }) => {
        const type = req.body.type;

        if (type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            throw new Error('Email deve ter um formato válido');
          }
        } else if (type === 'phone') {
          const phoneRegex = /^[\d\s\-\+\(\)]+$/;
          if (!phoneRegex.test(value)) {
            throw new Error('Telefone deve conter apenas números e caracteres válidos');
          }
          if (value.replace(/\D/g, '').length < 8) {
            throw new Error('Telefone deve ter pelo menos 8 dígitos');
          }
        }

        return true;
      }),

    body('label')
      .optional()
      .isIn(['primary', 'secondary', 'work', 'personal', 'mobile', 'home', 'whatsapp', 'commercial'])
      .withMessage('Label do contato inválido'),

    body('is_primary')
      .optional()
      .isBoolean()
      .withMessage('is_primary deve ser um valor booleano')
  ],

  // Validação para atualizar lead
  updateLead: [
    body('name')
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage('Nome deve ter entre 1 e 255 caracteres')
      .trim()
      .escape(),

    body('email')
      .optional()
      .isEmail()
      .withMessage('Email deve ter um formato válido')
      .normalizeEmail(),

    body('phone')
      .optional()
      .matches(/^[\d\s\-\+\(\)]+$/)
      .withMessage('Telefone deve conter apenas números e caracteres válidos')
      .custom((value) => {
        if (value && value.replace(/\D/g, '').length < 8) {
          throw new Error('Telefone deve ter pelo menos 8 dígitos');
        }
        return true;
      }),

    body('message')
      .optional()
      .isLength({ max: 2000 })
      .withMessage('Mensagem deve ter no máximo 2000 caracteres')
      .trim(),

    body('status')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Status deve ter entre 1 e 50 caracteres')
      .trim(),

    body('platform')
      .optional()
      .isIn(['whatsapp', 'instagram', 'facebook', 'website', 'telegram', 'email', 'phone', 'linkedin', 'other'])
      .withMessage('Plataforma inválida'),

    body('column_id')
      .optional()
      .isUUID(4)
      .withMessage('ID da coluna deve ser um UUID válido'),

    body('assigned_to_user_id')
      .optional()
      .isUUID(4)
      .withMessage('ID do usuário deve ser um UUID válido'),

    body('notes')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Notas devem ter no máximo 5000 caracteres')
      .trim(),

    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Prioridade deve ser low, medium, high ou urgent')
  ],

  // Validação para parâmetros de paginação
  validatePagination: [
    param('leadId')
      .isUUID(4)
      .withMessage('ID do lead deve ser um UUID válido'),

    body('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Página deve ser um número entre 1 e 1000'),

    body('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limite deve ser um número entre 1 e 50')
  ]
};

module.exports = leadModalValidation;