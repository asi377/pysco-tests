const { RegisterDTO, LoginDTO } = require('../auth/auth.dto');
const AppError = require('../../domain/errors/AppError');

const registerValidator = (req, res, next) => {
  const dto = new RegisterDTO(req.body);
  const errors = dto.validate();
  if (errors.length > 0) {
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }
  req.body = dto;
  next();
};

const loginValidator = (req, res, next) => {
  const dto = new LoginDTO(req.body);
  const errors = dto.validate();
  if (errors.length > 0) {
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }
  req.body = dto;
  next();
};

const sessionValidator = (req, res, next) => {
  next();
};

const answerValidator = (req, res, next) => {
  const { answers } = req.body;
  const errors = [];

  if (!Array.isArray(answers) || answers.length === 0) {
    errors.push('پاسخ‌ها باید یک آرایه باشند');
  }

  for (const ans of answers || []) {
    if (!ans.questionId) errors.push('شناسه سوال الزامی است');
    if (typeof ans.answer !== 'number' || ans.answer < 0 || ans.answer > 4) {
      errors.push('پاسخ باید عددی بین ۰ تا ۴ باشد');
    }
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  next();
};

const singleAnswerValidator = (req, res, next) => {
  const { sessionId, answer } = req.body;
  const errors = [];

  if (!sessionId) errors.push('شناسه جلسه الزامی است');

  if (!answer || typeof answer !== 'object') {
    errors.push('پاسخ باید یک شیء باشد');
  } else {
    if (typeof answer.questionNumber !== 'number' || answer.questionNumber < 1 || answer.questionNumber > 240) {
      errors.push('شماره سوال باید بین ۱ تا ۲۴۰ باشد');
    }
    if (typeof answer.value !== 'number' || answer.value < 0 || answer.value > 4) {
      errors.push('مقدار پاسخ باید بین ۰ تا ۴ باشد');
    }
  }

  if (errors.length > 0) {
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  next();
};

module.exports = {
  registerValidator,
  loginValidator,
  sessionValidator,
  answerValidator,
  singleAnswerValidator,
};
