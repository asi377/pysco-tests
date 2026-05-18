const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
    {
        questionNumber: {
            type: Number,
            required: true,
            unique: true,
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
                enum: [
                    'روان‌نژندی',
                    'برون‌گرایی',
                    'گشودگی به تجربه',
                    'توافق‌پذیری',
                    'وظیفه‌شناسی',
                ],
            },
            en: {
                type: String,
                required: true,
                enum: [
                    'Neuroticism',
                    'Extraversion',
                    'Openness',
                    'Agreeableness',
                    'Conscientiousness',
                ],
            },
        },

        facet: {
            fa: { type: String, required: true, trim: true },
            en: { type: String, required: true, trim: true },
            code: { type: String, required: true, trim: true }, // مانند N1, E3, C2 جهت پایداری کوئری‌ها
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
    },
    {
        timestamps: true,
    },
);

questionSchema.index({ 'domain.en': 1, 'facet.code': 1 });

module.exports = mongoose.model('NEOQuestion', questionSchema);
