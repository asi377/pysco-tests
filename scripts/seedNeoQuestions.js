const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const Test = require('../src/models/Test');
const Question = require('../src/models/neo/Question');
const { QUESTIONS_FULL } = require('../src/services/neoQuestions');

async function seed() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcsyco_tests';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    await Test.deleteMany({ slug: { $ne: 'neo' } });

    let test = await Test.findOne({ slug: 'neo' });
    if (!test) {
      test = await Test.create({
        title: 'نئو-PI-R',
        slug: 'neo',
        type: 'neo',
        description: 'آزمون شخصیتی نئو-PI-R شامل 240 سوال برای ارزیابی پنج عامل بزرگ شخصیت (مقیاس 0-4)',
        totalQuestions: 240,
        duration: 45,
        isActive: true,
      });
      console.log('Created NEO test:', test._id);
    } else {
      console.log('NEO test already exists:', test._id);
    }

    await Question.deleteMany({ testId: { $ne: test._id } });
    console.log('Deleted questions not belonging to current test');

    const questionDocs = QUESTIONS_FULL.map(q => ({
      testId: test._id,
      questionNumber: q.questionNumber,
      text: q.text,
      domain: q.domain,
      facet: q.facet,
      isReversed: q.isReversed,
      options: q.options,
      isActive: q.isActive !== false,
    }));

    await Question.insertMany(questionDocs);
    console.log(`Seeded ${questionDocs.length} questions with 0-4 scale from verified database`);

    await mongoose.disconnect();
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
