const rateLimit = require('express-rate-limit');
const config = require('../config/env');

// Slows down password guessing on login and register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.nodeEnv === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
  },
});

// Slows down repeated payment attempts and download-token guessing
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.nodeEnv === 'production' ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

module.exports = { authLimiter, sensitiveLimiter, };