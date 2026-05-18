const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
    res.redirect('/tests');
});

module.exports = router;