require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Test = require('./src/models/Test');
const Question = require('./src/models/neo/Question');

const connectDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
};

async function seed() {
    try {
        await connectDB();

        const neoTest = await Test.findOneAndUpdate(
            { slug: 'neo-pi-r' },
            {
                title: 'پرسشنامه شخصیت نئو-PI-R',
                slug: 'neo-pi-r',
                type: 'neo',
                description: 'پرسشنامه بازنگری شده شخصیت نئو - ارزیابی پنج عامل بزرگ شخصیت',
                totalQuestions: 240,
                duration: 45,
                isActive: true,
            },
            { upsert: true, returnDocument: 'after' },
        );

        console.log('NEO Test created:', neoTest._id);

        await Question.deleteMany({ testId: neoTest._id });

        const testJsonPath = path.join(__dirname, 'NEO', 'test.json');
        const questions = JSON.parse(fs.readFileSync(testJsonPath, 'utf8'));

        const formattedQuestions = questions.map((q) => ({
            testId: neoTest._id,
            questionNumber: q.questionNumber,
            text: q.text,
            domain: q.domain,
            facet: q.facet,
            isReversed: q.isReversed,
            options: q.options,
            isActive: q.isActive,
        }));

        await Question.insertMany(formattedQuestions);

        console.log(`Seeded ${formattedQuestions.length} questions`);

        const mbtiTest = await Test.findOneAndUpdate(
            { slug: 'mbti' },
            {
                title: 'تست MBTI',
                slug: 'mbti',
                type: 'mbti',
                description: 'شاخص تیپ شخصیت مایرز-بریگز',
                totalQuestions: 60,
                duration: 30,
                isActive: false,
            },
            { upsert: true, returnDocument: 'after' },
        );

        console.log('MBTI Test created (inactive):', mbtiTest._id);

        const discTest = await Test.findOneAndUpdate(
            { slug: 'disc' },
            {
                title: 'تست DISC',
                slug: 'disc',
                type: 'disc',
                description: 'مدل رفتار DISC برای ارزیابی سبک رفتار',
                totalQuestions: 28,
                duration: 15,
                isActive: false,
            },
            { upsert: true, returnDocument: 'after' },
        );

        console.log('DISC Test created (inactive):', discTest._id);

        const neoCount = await Question.countDocuments({ testId: neoTest._id });
        console.log(`\nTotal NEO questions in DB: ${neoCount}`);

        console.log('\nSeed completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
}

seed();