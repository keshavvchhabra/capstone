const express = require('express');
const prisma = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes in this file require authentication
router.use(authenticateToken);

// Search users by name or email (excluding current user)
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ users: [] });
    }

    const safeQuery = query.trim();

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.userId },
        OR: [
          { email: { contains: safeQuery, mode: 'insensitive' } },
          { name: { contains: safeQuery, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


