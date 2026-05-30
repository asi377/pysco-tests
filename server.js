const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');

const connectDB = require('./src/config/db');
const authRouter = require('./src/routes/authRoutes');
const testRouter = require('./src/routes/testRoutes');
const resultRouter = require('./src/routes/resultRoutes');
const { errorHandler } = require('./src/middlewares/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('Connecting to database...');
connectDB();

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tests', testRouter);
app.use('/api/v1/results', resultRouter);

app.get('/api/v1', (_req, res) => {
  res.json({ message: 'Personality Tests API v1 is running' });
});

app.use(errorHandler);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'مسیر یافت نشد',
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;