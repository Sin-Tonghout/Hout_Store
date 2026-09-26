const fs = require('fs');
const path = require('path');

const folders = [
  'backend/config',
  'backend/controllers',
  'backend/middleware',
  'backend/models',
  'backend/routes',
  'backend/services',
  'backend/validators',
  'backend/utils',
  'backend/migrations',
  'frontend/pages',
  'frontend/admin',
  'frontend/css',
  'frontend/js/admin',
  'frontend/images',
  'storage/products',
];

folders.forEach((folder) => {
  fs.mkdirSync(path.join(__dirname, folder), { recursive: true });
  console.log('created:', folder);
});

// keeps the empty storage folder in Git
fs.writeFileSync(path.join(__dirname, 'storage/products/.gitkeep'), '');
console.log('Done.');