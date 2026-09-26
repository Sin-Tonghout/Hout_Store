// One-off tool: checks every product's cover image and digital file against
// the R2 bucket, and reports which ones are missing (uploaded before the
// switch to R2, or otherwise never made it there).
//
// Run with: node backend/scripts/checkStorageFiles.js

const path = require('path');
const { pool } = require('../config/database');
const config = require('../config/env');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'auto',
  endpoint: config.r2.endpoint,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

async function existsInR2(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: config.r2.bucketName, Key: key }));
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
    throw err; // a real connection/credential problem, not just "missing"
  }
}

async function run() {
  if (config.storageDriver !== 'r2') {
    console.log('STORAGE_DRIVER is not "r2" — nothing to check against R2.');
    process.exit(0);
  }

  const [products] = await pool.execute(
    `SELECT id, name, slug, cover_image, file_name, status FROM products ORDER BY id ASC`
  );

  console.log(`Checking ${products.length} products against bucket "${config.r2.bucketName}"...\n`);

  let missingCount = 0;

  for (const p of products) {
    const checks = [];

    if (p.cover_image) {
      const coverKey = `covers/${path.basename(p.cover_image)}`;
      checks.push(['cover', coverKey]);
    }
    if (p.file_name) {
      const fileKey = `products/${p.file_name}`;
      checks.push(['file', fileKey]);
    }

    for (const [type, key] of checks) {
      const ok = await existsInR2(key);
      if (!ok) {
        missingCount++;
        console.log(
          `MISSING  [${type}]  product #${p.id} "${p.name}" (${p.status})  ->  ${key}`
        );
      }
    }
  }

  console.log(`\nDone. ${missingCount} missing file(s) out of ${products.length} product(s) checked.`);
  await pool.end();
}

run().catch((err) => {
  console.error('Check failed:', err.message);
  process.exit(1);
});