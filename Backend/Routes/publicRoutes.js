const express = require('express');
const router = express.Router();
const { getEnemyPreview } = require('../enemy-preview/publicControllers');
const { getGuestStarterPikachu } = require('../guest-starter/publicControllers');

router.route('/enemy-preview').get(getEnemyPreview);
router.route('/guest-starter-pikachu').get(getGuestStarterPikachu);

module.exports = router;
