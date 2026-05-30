const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
  },

  questionNumber: {
    type: Number,
    required: true,
    min: 1,
  },

  text: {
    fa: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },

  domain: {
    fa: {
      type: String,
      required: true,
    },
    en: {
      type: String,
      required: true,
    },
  },

  facet: {
    fa: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
  },

  isReversed: {
    type: Boolean,
    default: false,
  },

  options: [
    {
      value: { type: Number, required: true },
      label: {
        fa: { type: String, required: true },
        en: { type: String, required: true },
      },
    },
  ],

  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

questionSchema.index({ testId: 1, questionNumber: 1 }, { unique: true });
questionSchema.index({ testId: 1, 'domain.en': 1, 'facet.code': 1 });

module.exports = mongoose.model('Question', questionSchema);