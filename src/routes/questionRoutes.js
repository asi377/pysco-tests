const express = require('express');
const router = express.Router();
const question = require('../models/neo/Question.js');

router.get('/tests', async (req, res) => {
    try {
        const tests = await question.find();
        res.status(200).json(tests);
    } catch (err) {
        res.status(400).json(err);
    }
});

module.exports = router;
