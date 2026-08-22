const express = require('express');
const router = express.Router();
const { migrate } = require('../../identity/AuthController');

router.post('/migrate', migrate);

module.exports = router;
