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
    const { testId } = req.body;
    const errors = [];

    if (!testId) {
        errors.push('شناسه تست الزامی است');
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
        if (typeof ans.answer !== 'number' || ans.answer < 1 || ans.answer > 5) {
            errors.push('پاسخ باید عددی بین ۱ تا ۵ باشد');
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
};