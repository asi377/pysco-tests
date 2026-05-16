const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/register', async (req, res) => {
    console.log('Body:', req.body);
    try {
        const { fullName, email, password } = req.body;

        // چک کردن اینکه ایمیل قبلاً ثبت نشده باشه
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'این ایمیل قبلاً ثبت شده است',
            });
        }

        // ساخت کاربر جدید
        const user = await User.create({
            fullName,
            email,
            password,
        });

        res.status(201).json({
            success: true,
            message: 'ثبت نام با موفقیت انجام شد',
            data: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        // خطای Validation از Mongoose
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(
                (err) => err.message,
            );
            return res.status(400).json({
                success: false,
                message: 'اطلاعات وارد شده نامعتبر است',
                errors: errors,
            });
        }

        // خطای duplicate key (ایمیل تکراری)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'این ایمیل قبلاً ثبت شده است',
            });
        }

        // خطای عمومی
        res.status(500).json({
            success: false,
            message: 'خطای سرور. لطفاً دوباره تلاش کنید',
        });
    }
});

module.exports = router;
