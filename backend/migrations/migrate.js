const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config/env');

async function run() {
  const useSsl = config.db.ssl;

  // TiDB Cloud: connect directly to the target database (created via the
  // dashboard/SQL Editor, not by this script). Local MySQL: connect without
  // a database first so we can create it if it doesn't exist yet.
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: useSsl ? config.db.name : undefined,
    multipleStatements: true,
    charset: 'utf8mb4',
    ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  });

  try {
    if (!useSsl) {
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${config.db.name}\`
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      await connection.query(`USE \`${config.db.name}\``);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(191) NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [rows] = await connection.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.name));

    const files = fs
      .readdirSync(__dirname)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log('skip   :', file);
        continue;
      }
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      console.log('applied:', file);
      ran++;
    }

    console.log(`\nDone. ${ran} new migration(s) applied.`);
  } finally {
    await connection.end();
  }
}

run().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});