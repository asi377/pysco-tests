const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const User = require('../src/models/User');
const Test = require('../src/models/Test');
const Question = require('../src/models/neo/Question');
const TestSession = require('../src/models/TestSession');
const Result = require('../src/models/Result');
const { scoreAssessment } = require('../src/services/neoScoringEngine');

const TARGET_EMAIL = 'alisi373737@gmail.com';

async function generateDummy() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pcsyco_tests';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: TARGET_EMAIL });
    if (!user) {
      console.log(`User ${TARGET_EMAIL} not found. Creating...`);
      console.log('Please register first, then run this script.');
      await mongoose.disconnect();
      return;
    }
    console.log(`User found: ${user.fullName} (${user.gender})`);

    const test = await Test.findOne({ slug: 'neo', isActive: true });
    if (!test) {
      console.log('NEO test not found. Seed the database first.');
      await mongoose.disconnect();
      return;
    }
    console.log('Test found:', test.title);

    const questions = await Question.find({ testId: test._id, isActive: true }).sort({ questionNumber: 1 });

    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`\n=== Creating attempt ${attempt} ===`);

      const session = await TestSession.create({
        userId: user._id,
        testId: test._id,
        isCompleted: true,
        completedAt: new Date(),
      });

      const answers = questions.map(q => ({
        questionId: q._id,
        answer: Math.floor(Math.random() * 5),
      }));

      session.answers = answers;
      await session.save();

      const questionNumMap = {};
      questions.forEach(q => { questionNumMap[q._id.toString()] = q.questionNumber; });

      const userResponses = {};
      session.answers.forEach(a => {
        const qNum = questionNumMap[a.questionId.toString()];
        if (qNum) userResponses[qNum] = a.answer;
      });

      const engineResult = scoreAssessment(userResponses, user.gender || 'مرد');

      const result = await Result.create({
        sessionId: session._id,
        testId: test._id,
        userId: user._id,
        type: 'neo',
        scores: engineResult,
        rawScores: engineResult,
        interpretation: engineResult,
        validity: engineResult.validity || { isValid: true, reason: '' },
        sharedWithAdmin: attempt === 1,
      });

      console.log(`Attempt ${attempt}: Result ${result._id} created (shared: ${result.sharedWithAdmin})`);
      console.log(`  Validity: ${engineResult.validity.isValid ? 'Valid' : 'Invalid - ' + engineResult.validity.reason}`);
    }

    console.log('\nDone! 3 dummy results generated for', TARGET_EMAIL);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

generateDummy();
