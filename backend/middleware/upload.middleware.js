const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/appError');
const { STORAGE_ROOT, deleteTemp } = require('../services/storage.service');

const TMP_DIR = path.join(STORAGE_ROOT, 'tmp');
fs.mkdirSync(TMP_DIR, { recursive: true });

const MAX_COVER_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 MB

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const FILE_EXTENSIONS = [
  '.zip', '.rar', '.7z', '.pdf', '.epub', '.docx', '.xlsx', '.pptx',
  '.psd', '.ai', '.fig', '.mp4', '.mp3', '.txt', '.csv', '.json',
];

const multerUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TMP_DIR),
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: 2 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === 'cover_image') {
      if (!IMAGE_EXTENSIONS.includes(ext) || !file.mimetype.startsWith('image/')) {
        return cb(new AppError('Cover must be a JPG, PNG or WebP image', 422));
      }
      return cb(null, true);
    }

    if (file.fieldname === 'digital_file') {
      if (!FILE_EXTENSIONS.includes(ext)) {
        return cb(new AppError(`File type "${ext || 'none'}" is not allowed`, 422));
      }
      return cb(null, true);
    }

    return cb(new AppError('Unexpected file field', 400));
  },
}).fields([
  { name: 'cover_image', maxCount: 1 },
  { name: 'digital_file', maxCount: 1 },
]);

// The browser can lie about the file type, so check the first bytes too
async function looksLikeImage(filePath) {
  const handle = await fsp.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp =
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    return isJpeg || isPng || isWebp;
  } finally {
    await handle.close();
  }
}

async function removeUploadedFiles(req) {
  const files = Object.values(req.files || {}).flat();
  await Promise.all(files.map((file) => deleteTemp(file.path)));
}

function uploadProductFiles(req, res, next) {
  multerUpload(req, res, async (err) => {
    if (err) return next(err);

    try {
      const cover = req.files && req.files.cover_image && req.files.cover_image[0];
      if (cover) {
        if (cover.size > MAX_COVER_BYTES) {
          throw new AppError('Cover image must be 2 MB or smaller', 422);
        }
        if (!(await looksLikeImage(cover.path))) {
          throw new AppError('The cover file is not a real image', 422);
        }
      }
      next();
    } catch (error) {
      await removeUploadedFiles(req);
      next(error);
    }
  });
}

module.exports = { uploadProductFiles, removeUploadedFiles };