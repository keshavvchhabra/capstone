const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
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

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  // Expect userId in handshake query so we can put this socket in a user room
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(`user:${userId}`);
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
            },
          },
        },
      });

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

      const payload = {
        message,
        conversationId,
      };

      console.log(message)

      io.to(`conversation:${conversationId}`).emit('message:new', payload);

      updatedConversation.participants.forEach((participant) => {
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
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());

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

