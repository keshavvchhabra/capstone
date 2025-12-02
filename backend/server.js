const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('socket.io');
const prisma = require('./utils/database');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const chatsRoutes = require('./routes/chats');
const usersRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', async (socket) => {
  console.log('Client connected', socket.id);

  // Expect userId in handshake query so we can put this socket in a user room
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(`user:${userId}`);
    
    // Auto-join user to all their conversation rooms for real-time updates
    try {
      const userConversations = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      });
      
      userConversations.forEach((participant) => {
        socket.join(`conversation:${participant.conversationId}`);
      });
      
      console.log(`User ${userId} joined ${userConversations.length} conversation rooms`);
    } catch (error) {
      console.error('Error joining conversation rooms:', error);
    }
  }

  socket.on('join_conversation', (conversationId) => {
    if (conversationId) {
      socket.join(`conversation:${conversationId}`);
    }
  });

  socket.on('leave_conversation', (conversationId) => {
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
  });

  // Handle sending a message over WebSocket
  socket.on('message:send', async (data, callback) => {
    try {
      const { conversationId, body } = data || {};

      if (!userId) {
        const error = 'Not authenticated';
        callback && callback({ ok: false, error });
        return;
      }

      if (!conversationId || !body || !body.trim()) {
        const error = 'conversationId and non-empty body are required';
        callback && callback({ ok: false, error });
        return;
      }

      // Ensure user is part of the conversation
      const membership = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
        },
      });

      if (!membership) {
        const error = 'Access denied';
        callback && callback({ ok: false, error });
        return;
      }

      // Create message (non-blocking for WebSocket)
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          body: body.trim(),
        },
        select: {
          id: true,
          body: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              profilePicture: true,
            },
          },
        },
      });

      // Prepare payload for broadcast
      const payload = {
        message,
        conversationId,
      };

      // Get conversation participants for broadcasting
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
        include: {
          participants: {
            select: {
              userId: true,
            },
          },
        },
      });

      // Broadcast to conversation room (all users viewing this conversation)
      io.to(`conversation:${conversationId}`).emit('message:receive', payload);
      // Also emit message:new for backward compatibility
      io.to(`conversation:${conversationId}`).emit('message:new', payload);

      // Broadcast to individual user rooms (ensures all participants receive it)
      // This is a fallback in case they're not in the conversation room
      updatedConversation.participants.forEach((participant) => {
        io.to(`user:${participant.userId}`).emit('message:receive', payload);
        // Also emit conversation:updated for conversation list refresh
        io.to(`user:${participant.userId}`).emit(
          'conversation:updated',
          conversationId
        );
      });

      callback && callback({ ok: true, message });
    } catch (error) {
      console.error('message:send error:', error);
      callback &&
        callback({ ok: false, error: 'Unable to send message. Please try again.' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

// Simple function to emit events from routes
app.set('io', io);

// Middleware
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

