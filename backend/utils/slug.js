const AppError = require('./appError');

function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

// Uses the given slug (error if taken), or builds one from the name (adds -2, -3 if taken)
async function buildSlug({ name, slug, exists }) {
  if (slug) {
    if (await exists(slug)) throw new AppError('This slug is already in use', 409);
    return slug;
  }

  const base = slugify(name);
  if (!base) {
    throw new AppError('Enter a slug using English letters and numbers', 422);
  }

  let candidate = base;
  let counter = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  return candidate;
}

module.exports = { slugify, buildSlug };