const express = require('express');
const leadModalController = require('../controllers/leadModalController');
const { authenticateToken } = require('../middleware/auth');
const leadModalValidation = require('../middleware/leadModalValidation');

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// Aplicar rate limiting a todas as rotas do modal
router.use(leadModalController.applyRateLimit);

// Rotas do modal principal
router.get('/:leadId/modal',
  leadModalValidation.validateLeadId,
  leadModalController.getModalData
);

router.get('/:leadId/stats',
  leadModalValidation.validateLeadId,
  leadModalController.getStats
);

// Rotas da timeline
router.get('/:leadId/timeline',
  leadModalValidation.validateLeadId,
  leadModalController.getTimeline
);

router.post('/:leadId/activities',
  leadModalValidation.validateLeadId,
  leadModalValidation.addActivity,
  leadModalController.addActivity
);

// Rotas de contatos
router.get('/:leadId/contacts',
  leadModalValidation.validateLeadId,
  leadModalController.getContacts
);

router.post('/:leadId/contacts',
  leadModalValidation.validateLeadId,
  leadModalValidation.addContact,
  leadModalController.addContact
);

// Rotas de arquivos
router.get('/:leadId/files',
  leadModalValidation.validateLeadId,
  leadModalController.getFiles
);

// Rota para atualizar lead
router.put('/:leadId',
  leadModalValidation.validateLeadId,
  leadModalValidation.updateLead,
  leadModalController.updateLead
);

module.exports = router;