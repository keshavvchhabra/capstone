const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes in this file require authentication
router.use(authenticateToken);

// Protected route example
router.get('/dashboard', (req, res) => {
  res.json({
    message: 'Welcome to the protected dashboard',
    user: req.user
  });
});

module.exports = router;

