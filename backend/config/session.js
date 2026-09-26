const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const config = require('./env');
const { pool } = require('./database');

const SESSION_COOKIE_NAME = 'ds.sid';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const store = new MySQLStore(
  {
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: SEVEN_DAYS,
    createDatabaseTable: false, // we manage the sessions table via our own migrations now
  },
  pool
);

const sessionMiddleware = session({
  name: SESSION_COOKIE_NAME,
  secret: config.sessionSecret,
  store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // JavaScript in the browser cannot read the cookie
    secure: config.nodeEnv === 'production', // HTTPS only in production
    sameSite: 'lax',
    maxAge: SEVEN_DAYS,
  },
});

module.exports = { sessionMiddleware, SESSION_COOKIE_NAME };