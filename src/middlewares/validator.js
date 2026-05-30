const validator = require('validator');

const registerValidator = (req, res, next) => {
    const { fullName, email, password } = req.body;

    const errors = [];

    // fullname
    if (!fullName || fullName.trim().length < 3) {
        errors.push('نام باید حداقل ۳ کاراکتر باشد');
    }

    // email
    if (!email || !validator.isEmail(email)) {
        errors.push('ایمیل نامعتبر است');
    }

    // password
    if (!password || password.length < 8) {
        errors.push('رمز عبور باید حداقل ۸ کاراکتر باشد');
    } else {
        const isValidPassword = validator.isStrongPassword(password, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 0,
        });

        if (!isValidPassword) {
            errors.push('رمز عبور باید شامل حروف بزرگ، کوچک و عدد باشد');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'خطا در اعتبارسنجی',
            errors,
        });
    }
    console.log(errors);

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
        res.status(400).json({
            success: false,
            message: 'خطا در اعتبارسنجی',
            errors,
        });
        return;
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
        res.status(400).json({
            success: false,
            message: 'خطا در اعتبارسنجی',
            errors,
        });
        return;
    }

    for (const ans of answers) {
        if (!ans.questionId) {
            errors.push('شناسه سوال الزامی است');
        }
        if (
            typeof ans.answer !== 'number' ||
            ans.answer < 1 ||
            ans.answer > 5
        ) {
            errors.push('پاسخ باید عددی بین ۱ تا ۵ باشد');
        }
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            message: 'خطا در اعتبارسنجی',
            errors,
        });
        return;
    }

    next();
};

module.exports = {
    registerValidator,
    loginValidator,
    sessionValidator,
    answerValidator,
};
