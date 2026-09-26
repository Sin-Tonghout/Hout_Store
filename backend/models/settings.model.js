const { pool } = require('../config/database');

const EDITABLE_KEYS = [
  'store_name',
  'store_tagline',
  'receipt_footer',
  'download_max_count',
  'download_expiry_days',
];

async function getMany(keys) {
  const [rows] = await pool.query(
    'SELECT setting_key, setting_value FROM settings WHERE setting_key IN (?)',
    [keys]
  );
  const map = {};
  rows.forEach((row) => (map[row.setting_key] = row.setting_value));
  return map;
}



async function getAllEditable() {
  return getMany(EDITABLE_KEYS);
}

async function updateMany(values) {
  for (const key of EDITABLE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      await pool.execute(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, String(values[key])]
      );
    }
  }
}
module.exports = { getMany, getAllEditable, updateMany, EDITABLE_KEYS };