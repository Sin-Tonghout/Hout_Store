const mysql = require('mysql2/promise');
const config = require('./env');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  // Read and write DATETIME/TIMESTAMP values as UTC. Without this, mysql2 uses
  // the Node server's local timezone, which shifts times when the database
  // (TiDB) stores UTC.
  timezone: 'Z',
  // TiDB Cloud Serverless requires TLS. Local AMPPS MySQL does not use this.
  ssl: config.db.ssl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
});

// Make every connection use UTC for NOW() / CURRENT_TIMESTAMP defaults, so
// local AMPPS and TiDB store times the same way. The store timezone
// (Asia/Phnom_Penh) is applied only when times are displayed.
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'", (err) => {
    if (err) console.error('[database] failed to set UTC time zone:', err.message);
  });
});

async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = { pool, testConnection };