const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../utils/database');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/profile-pictures');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.user.userId}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
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

// Helper function to delete profile picture file
const deleteProfilePictureFile = async (userId) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePicture: true },
    });

    if (currentUser?.profilePicture) {
      const oldFilePath = path.join(
        __dirname,
        '../uploads/profile-pictures',
        path.basename(currentUser.profilePicture)
      );
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
  } catch (error) {
    console.error('Error deleting profile picture file:', error);
  }
};

// Update profile (name and/or profile picture)
router.put('/me', upload.single('profilePicture'), async (req, res) => {
  try {
    const { name, removeProfilePicture } = req.body;
    const userId = req.user.userId;

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name.trim() || null;
    }

    if (removeProfilePicture === 'true' || removeProfilePicture === true) {
      // Remove profile picture
      await deleteProfilePictureFile(userId);
      updateData.profilePicture = null;
    } else if (req.file) {
      // Upload new profile picture
      await deleteProfilePictureFile(userId);
      updateData.profilePicture = `/uploads/profile-pictures/${req.file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
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

// Delete profile picture
router.delete('/me/picture', async (req, res) => {
  try {
    const userId = req.user.userId;

    await deleteProfilePictureFile(userId);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: null },
      select: {
        id: true,
        email: true,
        name: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'Profile picture removed successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
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

