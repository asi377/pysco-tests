const catchAsync = require('../utils/catchAsync');

const getQuestion = catchAsync(async (req, res) => {
  res.redirect('/api/v1/tests');
});

module.exports = { getQuestion };