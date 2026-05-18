const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, 'fullname required'],
            trim: true,
            minlength: [3, 'fullname must be bigger than 3 characters'],
            maxlength: [100, 'fullname can not be bigger than 100 characters'],
        },

        email: {
            type: String,
            required: [true, 'email required'],
            unique: true,
            lowercase: true,
            trim: true,
            validate: [validator.isEmail, 'Please enter a valid email'],
        },

        password: {
            type: String,
            minlength: [8, 'password must be at least 8 characters'],
            select: false,
        },

        isGuest: {
            type: Boolean,
            default: false,
        },

        guestToken: {
            type: String,
            unique: true,
            sparse: true,
        },

        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
    },
    {
        timestamps: true,
    },
);
// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
