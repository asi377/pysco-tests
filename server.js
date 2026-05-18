require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db.js');
const authRouter = require('./src/routes/authRoutes.js');
const testRouter = require('./src/routes/testRoutes.js');
const resultRouter = require('./src/routes/resultRoutes.js');
const errorHandler = require('./src/middlewares/errorHandler.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

app.use('/auth', authRouter);
app.use('/tests', testRouter);
app.use('/results', resultRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Personality Tests API is running' });
});

app.use(errorHandler);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'مسیر یافت نشد',
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});