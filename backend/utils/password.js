const crypto = require('crypto');

// Shared password hashing helpers using Node's built-in crypto
const HASH_ALGO = 'sha256';
const HASH_ITERATIONS = 100_000;
const HASH_KEY_LENGTH = 64;
const SALT_BYTES = 16;

const hashPassword = (password) => {
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = crypto
    .pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_ALGO)
    .toString('hex');
  // Store as salt:iterations:hash
  return `${salt}:${HASH_ITERATIONS}:${derivedKey}`;
};

const verifyPassword = (password, stored) => {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) {
    return false;
  }

  const [salt, iterationsStr, storedHash] = stored.split(':');
  const iterations = parseInt(iterationsStr, 10) || HASH_ITERATIONS;

  const derivedKey = crypto
    .pbkdf2Sync(password, salt, iterations, HASH_KEY_LENGTH, HASH_ALGO)
    .toString('hex');

  const hashBuf = Buffer.from(storedHash, 'hex');
  const derivedBuf = Buffer.from(derivedKey, 'hex');
  if (hashBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, derivedBuf);
};

module.exports = {
  hashPassword,
  verifyPassword,
};




