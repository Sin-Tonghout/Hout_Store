const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');

const STORAGE_ROOT = path.join(__dirname, '../../storage');
const AREAS = ['products', 'covers'];

// ---------- Local driver (development) ----------

function localPathFor(area, name) {
  return path.join(STORAGE_ROOT, area, path.basename(name)); // basename blocks ../ tricks
}

async function localSaveFile(area, tempPath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const storedName = crypto.randomBytes(16).toString('hex') + ext;
  await fs.mkdir(path.join(STORAGE_ROOT, area), { recursive: true });
  await fs.rename(tempPath, localPathFor(area, storedName));
  return storedName;
}

async function localDeleteFile(area, name) {
  if (!name) return;
  try {
    await fs.unlink(localPathFor(area, name));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not delete local file:', err.message);
  }
}

// ---------- R2 driver (production) ----------

let s3Client = null;
let S3_MODULES = null;

function getS3() {
  if (!s3Client) {
    // Loaded lazily so the package is only required when R2 is actually used
    S3_MODULES = {
      S3Client: require('@aws-sdk/client-s3').S3Client,
      PutObjectCommand: require('@aws-sdk/client-s3').PutObjectCommand,
      DeleteObjectCommand: require('@aws-sdk/client-s3').DeleteObjectCommand,
      GetObjectCommand: require('@aws-sdk/client-s3').GetObjectCommand,
      getSignedUrl: require('@aws-sdk/s3-request-presigner').getSignedUrl,
    };
    s3Client = new S3_MODULES.S3Client({
      region: 'auto',
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return s3Client;
}

function r2Key(area, name) {
  return `${area}/${name}`;
}

async function r2SaveFile(area, tempPath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const storedName = crypto.randomBytes(16).toString('hex') + ext;
  const body = await fs.readFile(tempPath);

  const client = getS3();
  await client.send(
    new S3_MODULES.PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: r2Key(area, storedName),
      Body: body,
    })
  );

  await fs.unlink(tempPath).catch(() => {});
  return storedName;
}

async function r2DeleteFile(area, name) {
  if (!name) return;
  try {
    const client = getS3();
    await client.send(
      new S3_MODULES.DeleteObjectCommand({ Bucket: config.r2.bucketName, Key: r2Key(area, name) })
    );
  } catch (err) {
    console.error('Could not delete R2 file:', err.message);
  }
}

// A short-lived signed URL, so protected digital files are never public
async function r2GetSignedUrl(area, name, expiresInSeconds = 60) {
  const client = getS3();
  const command = new S3_MODULES.GetObjectCommand({ Bucket: config.r2.bucketName, Key: r2Key(area, name) });
  return S3_MODULES.getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

// ---------- Public interface (used everywhere else in the app) ----------

function assertArea(area) {
  if (!AREAS.includes(area)) throw new Error('Unknown storage area');
}

async function saveFile(area, tempPath, originalName) {
  assertArea(area);
  return config.storageDriver === 'r2'
    ? r2SaveFile(area, tempPath, originalName)
    : localSaveFile(area, tempPath, originalName);
}

async function deleteFile(area, name) {
  assertArea(area);
  return config.storageDriver === 'r2' ? r2DeleteFile(area, name) : localDeleteFile(area, name);
}

async function deleteTemp(tempPath) {
  try {
    await fs.unlink(tempPath);
  } catch (err) {
    // already moved or removed
  }
}

// Local-only: used by the download controller to stream a file directly.
// On R2, downloads use getDownloadUrl() instead (see below).
function getFilePath(area, name) {
  if (config.storageDriver === 'r2') {
    throw new Error('getFilePath() is local-only; use getDownloadUrl() when STORAGE_DRIVER=r2');
  }
  return localPathFor(area, name);
}

// Returns whatever the download controller needs to serve the file:
// - local: an absolute file path (res.download() streams it directly)
// - r2: a short-lived signed URL (the customer's browser is redirected to it)
async function getDownloadUrl(area, name) {
  assertArea(area);
  if (config.storageDriver === 'r2') {
    return { type: 'redirect', url: await r2GetSignedUrl(area, name, 60) };
  }
  return { type: 'file', path: localPathFor(area, name) };
}

// Cover images: local files are served via Express static (/uploads/covers/...);
// on R2 they need a public URL. R2 buckets can have a public dev URL enabled,
// or a custom domain — set R2_PUBLIC_BASE_URL if you enable public access.
function coverUrl(storedPath) {
  if (!storedPath) return null;
  if (config.storageDriver !== 'r2') return storedPath;
  const name = path.basename(storedPath);
  const base = config.r2.publicBaseUrl || config.r2.endpoint;
  return `${base}/covers/${name}`;
}

module.exports = {
  STORAGE_ROOT,
  saveFile,
  deleteFile,
  deleteTemp,
  getFilePath,
  getDownloadUrl,
  coverUrl,
};