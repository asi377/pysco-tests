const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
    {
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'NEOQuestion',
            required: true,
        },

        answer: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
    },
    {
        _id: false,
    },
);

const testSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        testId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Test',
            required: true,
        },

        answers: [answerSchema],

        isCompleted: {
            type: Boolean,
            default: false,
        },

        startedAt: {
            type: Date,
            default: Date.now,
        },

        completedAt: Date,
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('TestSession', testSessionSchema);

// این فایل رو باید بررسی کنی چون عجله داشتی رفتی و نتونستی کامل بخش ref هر تیکه رو بررسی کنی
