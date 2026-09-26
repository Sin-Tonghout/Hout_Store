const bcrypt = require('bcrypt');

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

module.exports = { hashPassword, comparePassword, DUMMY_HASH };