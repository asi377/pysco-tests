const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Test = require('../models/Test');
const { registerValidator, loginValidator } = require('../middlewares/validator');

const router = express.Router();

const generateToken = (user, type = 'user') => {
    let payload;

    if (type === 'guest') {
        payload = { guestToken: user.guestToken };
    } else {
        payload = { id: user._id, type: 'user' };
    }

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

router.post('/register', registerValidator, async (req, res) => {
    try {
        const { fullName, email, password, guestToken } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'این ایمیل قبلاً ثبت شده است',
            });
        }

        let user;
        let upgraded = false;

        if (guestToken) {
            const guestUser = await User.findOne({ guestToken, isGuest: true });
            if (guestUser) {
                guestUser.fullName = fullName;
                guestUser.email = email;
                guestUser.password = password;
                guestUser.isGuest = false;
                guestUser.guestToken = undefined;
                await guestUser.save();

                user = guestUser;
                upgraded = true;
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'توکن مهمان نامعتبر است',
                });
            }
        } else {
            user = await User.create({
                fullName,
                email,
                password,
            });
        }

        const token = generateToken(user, 'user');

        res.status(201).json({
            success: true,
            message: upgraded
                ? 'ثبت‌نام با موفقیت انجام شد (ارتقا از مهمان)'
                : 'ثبت‌نام با موفقیت انجام شد',
            data: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                token,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);

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

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'این ایمیل قبلاً ثبت شده است',
            });
        }

        res.status(500).json({
            success: false,
            message: 'خطای سرور. لطفاً دوباره تلاش کنید',
        });
    }
});

router.post('/login', loginValidator, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ایمیل یا رمز عبور اشتباه است',
            });
        }

        if (user.isGuest) {
            return res.status(401).json({
                success: false,
                message: 'این حساب یک حساب مهمان است. لطفاً ثبت‌نام کنید',
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'ایمیل یا رمز عبور اشتباه است',
            });
        }

        const token = generateToken(user, 'user');

        res.json({
            success: true,
            message: 'ورود با موفقیت انجام شد',
            data: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                token,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور. لطفاً دوباره تلاش کنید',
        });
    }
});

router.post('/guest', async (req, res) => {
    try {
        const tests = await Test.find({ isActive: true });

        const guestUser = await User.create({
            fullName: 'مهمان',
            email: `guest_${Date.now()}@guest.local`,
            isGuest: true,
            guestToken: `gt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        });

        const token = generateToken(guestUser, 'guest');

        res.status(201).json({
            success: true,
            message: 'حساب مهمان ایجاد شد',
            data: {
                id: guestUser._id,
                guestToken: guestUser.guestToken,
                tests: tests.map((t) => ({
                    id: t._id,
                    slug: t.slug,
                    title: t.title,
                    type: t.type,
                })),
                token,
            },
        });
    } catch (error) {
        console.error('Guest creation error:', error);
        res.status(500).json({
            success: false,
            message: 'خطای سرور. لطفاً دوباره تلاش کنید',
        });
    }
});

module.exports = router;