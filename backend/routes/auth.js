const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/database');

const router = express.Router();

// Password hashing helpers using Node's built-in crypto
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

  // Use constant-time comparison to avoid timing attacks
  const hashBuf = Buffer.from(storedHash, 'hex');
  const derivedBuf = Buffer.from(derivedKey, 'hex');
  if (hashBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, derivedBuf);
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password using crypto
    const hashedPassword = hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null
      },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password using crypto-based hash
    const isValidPassword = verifyPassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;

