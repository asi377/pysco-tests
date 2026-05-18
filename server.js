require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db.js');
const userRouter = require('./src/routes/authRoutes.js');
const testsRouter = require('./src/routes/questionRoutes.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to Database
connectDB();

// Routes
app.use(userRouter);
app.use(testsRouter);

// Test Route
app.get('/', (req, res) => {
    res.json({ message: 'NEO Test API is running' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
