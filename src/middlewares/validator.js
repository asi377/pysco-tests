const validator = require('validator');

const registerValidator = (req, res, next) => {
  const { fullName, email, password } = req.body;

  const errors = [];

  if (!fullName || fullName.trim().length < 3) {
    errors.push('نام باید حداقل ۳ کاراکتر باشد');
  }

  if (!email || !validator.isEmail(email)) {
    errors.push('ایمیل نامعتبر است');
  }

  if (!password || password.length < 8) {
    errors.push('رمز عبور باید حداقل ۸ کاراکتر باشد');
  } else {
    if (!/[A-Za-z]/.test(password)) {
      errors.push('رمز عبور باید حداقل یک حرف انگلیسی داشته باشد');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('رمز عبور باید حداقل یک عدد داشته باشد');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'خطا در اعتبارسنجی',
      errors,
    });
  }

  next();
};

const loginValidator = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !validator.isEmail(email)) {
    errors.push('ایمیل نامعتبر است');
  }

  if (!password) {
    errors.push('رمز عبور الزامی است');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'خطا در اعتبارسنجی',
      errors,
    });
  }

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
    return res.status(400).json({
      success: false,
      message: 'خطا در اعتبارسنجی',
      errors,
    });
  }

  for (const ans of answers) {
    if (!ans.questionId) {
      errors.push('شناسه سوال الزامی است');
    }
    if (typeof ans.answer !== 'number' || ans.answer < 0 || ans.answer > 4) {
      errors.push('پاسخ باید عددی بین ۰ تا ۴ باشد');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'خطا در اعتبارسنجی',
      errors,
    });
  }

  next();
};

const singleAnswerValidator = (req, res, next) => {
  const { sessionId, answer } = req.body;
  const errors = [];

  if (!sessionId) {
    errors.push('شناسه جلسه الزامی است');
  }

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
    return res.status(400).json({
      success: false,
      message: 'خطا در اعتبارسنجی',
      errors,
    });
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
