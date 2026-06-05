const express = require('express');
const router = express.Router();
const { activate, patchDraft, saveDraft } = require('../controllers/PokemonSessionController');

router.post('/activate', activate);
router.patch('/draft/:sessionId', patchDraft);
router.post('/save/:sessionId', saveDraft);

module.exports = router;
