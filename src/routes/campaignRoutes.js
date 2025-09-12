const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const campaignController = require('../controllers/campaignController');

const router = express.Router();

// Campanhas
router.get('/', authenticateToken, campaignController.listCampaigns);
router.get('/:id', authenticateToken, campaignController.getCampaign);
router.post('/', authenticateToken, campaignController.createCampaign);
router.put('/:id', authenticateToken, campaignController.updateCampaign);
router.delete('/:id', authenticateToken, campaignController.deleteCampaign);

// Relatórios de campanha
router.get('/:campaignId/effective-phrases', authenticateToken, campaignController.getMostEffectivePhrases);
router.get('/:campaignId/debug-reports', authenticateToken, campaignController.debugCampaignReports);

// Frases gatilho
router.get('/:campaignId/phrases', authenticateToken, campaignController.listTriggerPhrases);
router.post('/:campaignId/phrases', authenticateToken, campaignController.createTriggerPhrase);
router.put('/:campaignId/phrases/:phraseId', authenticateToken, campaignController.updateTriggerPhrase);
router.delete('/:campaignId/phrases/:phraseId', authenticateToken, campaignController.deleteTriggerPhrase);

// Teste de matching de frase específica
router.post('/:campaignId/phrases/:phraseId/test', authenticateToken, campaignController.testPhraseMatch);

module.exports = router;
