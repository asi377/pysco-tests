// ============================================================
// 1) UNCAUGHT EXCEPTION — catches synchronous throws that
//    no try/catch or Express chain handled.
//    Process state is unsafe after this, so we log and exit
//    immediately without attempting graceful shutdown.
// ============================================================
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const connectDB = require('./src/config/db');
const authRouter = require('./src/routes/authRoutes');
const testRouter = require('./src/routes/testRoutes');
const resultRouter = require('./src/routes/resultRoutes');
const { errorHandler } = require('./src/middlewares/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:5173'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: isProduction,
}));

app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'تعداد درخواست‌های شما بیش از حد مجاز است' },
});
app.use('/api/', globalLimiter);

console.log('Connecting to database...');
connectDB();

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tests', testRouter);
app.use('/api/v1/results', resultRouter);

app.get('/api/v1', (_req, res) => {
  res.json({ message: 'Personality Tests API v1 is running' });
});

// 404 handler — must come before Express error handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'مسیر یافت نشد',
  });
});

// ============================================================
// 3) EXPRESS ERROR HANDLER — catches errors passed via
//    next(err) from routes/controllers. This includes both
//    AppError (operational) and unexpected errors. Operational
//    errors get their specific message; unexpected ones get a
//    generic 500 response so internals never leak to the client.
// ============================================================
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ============================================================
// 2) UNHANDLED REJECTION — catches promise rejections that
//    bypassed catchAsync (e.g. background promises, forgotten
//    .catch()). We attempt a graceful shutdown: stop accepting
//    new requests, let in-flight ones finish, then exit.
// ============================================================
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down gracefully...');
  console.error(err.name, err.message, err.stack);
  server.close(() => process.exit(1));
});

module.exports = app;
