const crypto = require('crypto');
const config = require('../config/env');

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // reject stale/replayed login payloads

// The bot's numeric id is the part of the token before the colon, e.g.
// "123456789:AAExampleTokenxxxxxxxxxxxxxxxxxxxxxxx" -> "123456789".
// This id is not secret; it is embedded in every Telegram widget/deep link.
function getBotId() {
  const token = config.telegram.botToken || '';
  const id = token.split(':')[0];
  return id ? Number(id) : null;
}

// Verifies the `hash` field Telegram signs the login payload with, per
// https://core.telegram.org/widgets/login#checking-authorization
function verifyTelegramAuth(data) {
  const botToken = config.telegram.botToken;
  if (!botToken || !data || !data.hash || !data.id || !data.auth_date) {
    return false;
  }

  const { hash, ...fields } = data;

  const checkString = Object.keys(fields)
    .filter((key) => fields[key] !== undefined && fields[key] !== null)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex');

  const validHash =
    computedHash.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));

  if (!validHash) return false;

  const ageSeconds = Math.floor(Date.now() / 1000) - Number(data.auth_date);
  return ageSeconds >= 0 && ageSeconds <= MAX_AUTH_AGE_SECONDS;
}

module.exports = { getBotId, verifyTelegramAuth };