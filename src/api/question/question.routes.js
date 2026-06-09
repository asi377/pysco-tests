const express = require('express');
const { getQuestion } = require('./question.controller');

const router = express.Router();

router.get('/', getQuestion);

module.exports = router;
