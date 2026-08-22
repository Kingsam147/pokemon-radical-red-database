const express = require('express');
const router = express.Router();
const { initGuest } = require('../../identity/GuestController');

router.get('/init', initGuest);

module.exports = router;
