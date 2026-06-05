const express = require('express');
const router = express.Router();
const { migrate } = require('../controllers/AuthController');

router.post('/migrate', migrate);

module.exports = router;
