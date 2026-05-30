const express = require('express');
const { getQuestion } = require('../controllers/questionController');

const router = express.Router();

router.get('/', getQuestion);

module.exports = router;