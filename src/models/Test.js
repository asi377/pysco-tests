const mongoose = require('mongoose');

const testSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        type: {
            type: String,
            required: true,
            enum: ['neo', 'mbti', 'disc'],
        },

        description: {
            type: String,
            trim: true,
        },

        totalQuestions: {
            type: Number,
            required: true,
            min: 1,
        },

        duration: {
            type: Number,
            default: 0,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('Test', testSchema);
