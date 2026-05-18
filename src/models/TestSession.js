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
            required: false,
        },

        guestToken: {
            type: String,
            required: false,
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

testSessionSchema.pre('save', function () {
    if (!this.userId && !this.guestToken) {
        throw new Error('Session must belong to a user or guest');
    }
});

module.exports = mongoose.model('TestSession', testSessionSchema);
