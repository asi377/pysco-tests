const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        tokenHash: {
            type: String,
            required: true,
            index: true,
        },

        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
