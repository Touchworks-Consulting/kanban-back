const express = require('express');
const { authenticateFlexible } = require('../middleware/auth');
const campaignController = require('../controllers/campaignController');

const router = express.Router();

// Campanhas - agora com suporte a JWT e API key (para iframe embed)
router.get('/', authenticateFlexible, campaignController.listCampaigns);
router.get('/:id', authenticateFlexible, campaignController.getCampaign);
router.post('/', authenticateFlexible, campaignController.createCampaign);
router.put('/:id', authenticateFlexible, campaignController.updateCampaign);
router.delete('/:id', authenticateFlexible, campaignController.deleteCampaign);

// Relatórios de campanha
router.get('/:campaignId/effective-phrases', authenticateFlexible, campaignController.getMostEffectivePhrases);
router.get('/:campaignId/debug-reports', authenticateFlexible, campaignController.debugCampaignReports);
router.get('/:campaignId/chart-data', authenticateFlexible, campaignController.getCampaignChartData);
router.get('/debug/all-campaigns-leads', authenticateFlexible, campaignController.debugAllCampaignsLeads);

// Frases gatilho
router.get('/:campaignId/phrases', authenticateFlexible, campaignController.listTriggerPhrases);
router.post('/:campaignId/phrases', authenticateFlexible, campaignController.createTriggerPhrase);
router.put('/:campaignId/phrases/:phraseId', authenticateFlexible, campaignController.updateTriggerPhrase);
router.delete('/:campaignId/phrases/:phraseId', authenticateFlexible, campaignController.deleteTriggerPhrase);

// Teste de matching de frase específica
router.post('/:campaignId/phrases/:phraseId/test', authenticateFlexible, campaignController.testPhraseMatch);

module.exports = router;
