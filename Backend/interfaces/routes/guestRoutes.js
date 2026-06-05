const express = require('express');
const router = express.Router();
const { initGuest } = require('../controllers/GuestController');

router.get('/init', initGuest);

module.exports = router;
