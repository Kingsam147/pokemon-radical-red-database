const express = require('express');
const router = express.Router();
const { getEnemyPreview } = require('../../enemy-preview/publicControllers');
const { getGuestStarterPikachu } = require('../../guest-starter/publicControllers');
const { getMoveAvailability } = require('../../game-data/moveAvailabilityController');

router.route('/enemy-preview').get(getEnemyPreview);
router.route('/guest-starter-pikachu').get(getGuestStarterPikachu);
// PUBLIC — no auth required: stateless movepool computation from species/level/checklist state, touches no user-owned data.
router.route('/move-availability').post(getMoveAvailability);

module.exports = router;
