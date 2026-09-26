const { pool } = require('../config/database');
const userModel = require('../models/user.model');
const { hashPassword } = require('./hash');

async function run() {
  const [name, email, password, roleArg] = process.argv.slice(2);
  const role = roleArg || 'admin';

  if (!name || !email || !password) {
    console.log('Usage: npm run create-admin -- "Name" root@c.c "root" [admin|super_admin]');
    process.exit(1);
  }
  if (!['admin', 'super_admin'].includes(role)) {
    console.log('Role must be admin or super_admin');
    process.exit(1);
  }
    if (process.env.NODE_ENV === 'production' && password.length < 8) {
    console.log('Password must be at least 8 characters in production');
    process.exit(1);
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = await userModel.findByEmail(cleanEmail);

  if (existing) {
    await userModel.updateRole(existing.id, role);
    console.log(`Existing user ${cleanEmail} is now: ${role}`);
  } else {
    const passwordHash = await hashPassword(password);
    await userModel.create({ name, email: cleanEmail, passwordHash, role });
    console.log(`Created ${role}: ${cleanEmail}`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});