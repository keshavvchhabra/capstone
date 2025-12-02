const express = require('express');
const prisma = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes in this file require authentication
router.use(authenticateToken);

// Helper: include shape for participants and last message
const conversationInclude = {
  participants: {
    select: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          profilePicture: true,
        },
      },
    },
  },
  messages: {
    take: 1,
    orderBy: { createdAt: 'desc' },
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
  },
};

const transformConversation = (conversation) => {
  const lastMessage = conversation.messages[0] || null;

  return {
    id: conversation.id,
    title: conversation.title,
    isGroup: conversation.isGroup,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    participants: conversation.participants.map((participant) => ({
      id: participant.user.id,
      email: participant.user.email,
      name: participant.user.name,
      profilePicture: participant.user.profilePicture,
    })),
    lastMessage,
  };
};

// Get conversations for current user
router.get('/', async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: req.user.userId,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: conversationInclude,
    });

    res.json({
      conversations: conversations.map(transformConversation),
    });
  } catch (error) {
    console.error('Fetch conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new conversation
router.post('/', async (req, res) => {
  try {
    const { participantIds = [], title, initialMessage } = req.body;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res
        .status(400)
        .json({ error: 'At least one participant is required' });
    }

    // Ensure current user is included
    const uniqueParticipantIds = Array.from(
      new Set([...participantIds, req.user.userId])
    );

    const conversation = await prisma.conversation.create({
      data: {
        title: title || null,
        isGroup: uniqueParticipantIds.length > 2,
        participants: {
          create: uniqueParticipantIds.map((userId) => ({
            userId,
          })),
        },
        messages: initialMessage
          ? {
              create: {
                body: initialMessage,
                senderId: req.user.userId,
              },
            }
          : undefined,
      },
      include: conversationInclude,
    });

    const transformed = transformConversation(conversation);

    res.status(201).json({ conversation: transformed });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a conversation with cursor-based pagination
router.get('/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { cursor } = req.query;

    // Ensure user is part of the conversation
    const membership = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const take = 20;

    const where = {
      conversationId,
    };

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
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

    let nextCursor = null;
    let items = messages;

    if (messages.length > take) {
      const nextItem = messages[messages.length - 1];
      nextCursor = nextItem.id;
      items = messages.slice(0, take);
    }

    // Return messages in ascending order for the UI
    items = items.reverse();

    res.json({
      messages: items,
      nextCursor,
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new message
router.post('/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    // Ensure user is part of the conversation
    const membership = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: req.user.userId,
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

    // Update conversation updatedAt
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

    // Emit real-time events
    const io = req.app.get('io');
    if (io) {
      const payload = {
        message,
        conversationId,
      };

      // Broadcast to conversation room
      io.to(`conversation:${conversationId}`).emit('message:receive', payload);
      // Also emit message:new for backward compatibility
      io.to(`conversation:${conversationId}`).emit('message:new', payload);

      // Broadcast to individual user rooms (ensures all participants receive it)
      updatedConversation.participants.forEach((participant) => {
        io.to(`user:${participant.userId}`).emit('message:receive', payload);
        // Also emit conversation:updated for conversation list refresh
        io.to(`user:${participant.userId}`).emit(
          'conversation:updated',
          conversationId
        );
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a message (only allowed for the user who sent it)
router.delete('/:conversationId/messages/:messageId', async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.user.userId;

    // Ensure user is part of the conversation
    const membership = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find the message and ensure it belongs to this conversation and user
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
      select: {
        id: true,
        senderId: true,
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Delete the message
    await prisma.message.delete({
      where: {
        id: messageId,
      },
    });

    // Find the new last message (if any) to update conversation preview
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
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

    // Update conversation's updatedAt based on last remaining message (or now if none)
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: lastMessage ? lastMessage.createdAt : new Date() },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    const io = req.app.get('io');
    if (io) {
      const payload = {
        conversationId,
        messageId,
        lastMessage,
        updatedAt: updatedConversation.updatedAt,
      };

      // Notify all clients in the conversation that a message was deleted
      io.to(`conversation:${conversationId}`).emit('message:deleted', payload);

      // Also notify individual user rooms and update their conversation lists
      updatedConversation.participants.forEach((participant) => {
        io.to(`user:${participant.userId}`).emit('message:deleted', payload);
        io.to(`user:${participant.userId}`).emit('conversation:updated', conversationId);
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;


