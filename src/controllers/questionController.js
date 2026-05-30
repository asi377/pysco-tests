const getQuestion = async (req, res) => {
  res.redirect('/api/v1/tests');
};

module.exports = { getQuestion };