const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
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
}, {
  timestamps: true,
});

module.exports = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
