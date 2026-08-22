const express = require('express');
const router = express.Router();
const { getEnemyPreview } = require('../enemy-preview/publicControllers');

router.route('/enemy-preview').get(getEnemyPreview);

module.exports = router;
