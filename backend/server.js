const config = require('./config/env');
const { testConnection } = require('./config/database');
const app = require('./app');

async function start() {
  try {
    await testConnection();
    console.log('MySQL connected');
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
    console.error('Check that AMPPS MySQL is running, then run: npm run migrate');
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Digital Store running on ${config.appUrl} (${config.nodeEnv})`);
  });
}

start();