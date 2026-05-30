const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSession',
    required: true,
  },

  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  guestToken: {
    type: String,
  },

  type: {
    type: String,
    required: true,
    enum: ['neo', 'mbti', 'disc'],
  },

  scores: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  rawScores: {
    type: mongoose.Schema.Types.Mixed,
  },

  percentile: {
    type: mongoose.Schema.Types.Mixed,
  },

  interpretation: {
    type: mongoose.Schema.Types.Mixed,
  },

  validity: {
    isValid: { type: Boolean, default: true },
    reason: { type: String, default: '' },
  },

  sharedWithAdmin: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

resultSchema.index({ userId: 1, testId: 1 });
resultSchema.index({ guestToken: 1, testId: 1 });
resultSchema.index({ sharedWithAdmin: 1 });

module.exports = mongoose.model('Result', resultSchema);
