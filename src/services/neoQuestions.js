const path = require('path');
const rawQuestions = require(
    path.resolve(
        __dirname,
        '../../NEO/NEO_240_Verified_Reference_Database.json',
    ),
);
const keys = require(
    path.resolve(__dirname, '../../NEO/NEO_240_Verified_Keys_Structure.json'),
);

const QUESTIONS = rawQuestions.map((q) => ({
    questionNumber: q.questionNumber,
    text: q.text.fa,
    facetCode: q.facet.code,
    isReversed: q.isReversed,
}));

const QUESTIONS_FULL = rawQuestions;
const KEYS = keys;

module.exports = { QUESTIONS, QUESTIONS_FULL, KEYS };
