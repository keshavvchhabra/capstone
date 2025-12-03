const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../utils/database');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile (name only – profile pictures removed)
router.put('/me', async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name.trim() || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.message.includes('Only image files')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update password: requires current password, new password, and confirmation
router.put('/me/password', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'New password must be at least 8 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidCurrent = verifyPassword(currentPassword, user.password);
    if (!isValidCurrent) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHashedPassword = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newHashedPassword,
      },
    });

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve profile pictures - this route is handled by express.static in server.js

module.exports = router;

