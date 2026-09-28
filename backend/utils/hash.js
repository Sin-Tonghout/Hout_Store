const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

// Compared against when an email does not exist, so login takes
// about the same time either way (prevents guessing which emails exist).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Password-reset tokens: we only ever store the hash, never the raw token,
// so a leaked database can't be used to reset accounts.
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = {
  hashPassword,
  comparePassword,
  DUMMY_HASH,
  generateResetToken,
  hashResetToken,
};