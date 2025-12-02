import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import ConversationList from '../components/chat/ConversationList'
import MessageBubble from '../components/chat/MessageBubble'
import NewChatModal from '../components/chat/NewChatModal'
import ProfileModal from '../components/ProfileModal'
import { fetchConversations, fetchMessages, deleteMessage } from '../api/chat'
import { useAuth } from '../context/AuthContext'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [conversationSearch, setConversationSearch] = useState('')
  const [messages, setMessages] = useState([])
  const [messagesCursor, setMessagesCursor] = useState(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [composerValue, setComposerValue] = useState('')
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [error, setError] = useState('')
  const endOfMessagesRef = useRef(null)
  const socketRef = useRef(null)
  const textareaRef = useRef(null)
  const activeConversationRef = useRef(null)
  const updateConversationInListRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Load conversations only on mount - never reload on message updates
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true)
      const response = await fetchConversations()
      const sorted = response.data.conversations.sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      )
      
      setConversations(sorted)
      
      // Only auto-select a conversation once on initial load
      const currentActive = activeConversationRef.current
      if (!currentActive && sorted.length) {
        setActiveConversation(sorted[0])
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load conversations')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  // Update a single conversation in the list without reloading everything
  const updateConversationInList = useCallback((conversationId, updates) => {
    setConversations((prev) => {
      const index = prev.findIndex((c) => c.id === conversationId)
      if (index === -1) {
        return prev
      }

      const updated = { ...prev[index], ...updates }
      const rest = prev.filter((c) => c.id !== conversationId)
      return [updated, ...rest].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      )
    })
  }, [])

  useEffect(() => {
    updateConversationInListRef.current = updateConversationInList
  }, [updateConversationInList])

  const loadMessages = useCallback(
    async (conversationId, { cursor, replace = true } = {}) => {
      if (!conversationId) return
      try {
        if (!cursor) {
          setIsLoadingMessages(true)
        }
        const response = await fetchMessages(conversationId, {
          cursor,
        })
        const payload = response.data
        setMessages((previous) => {
          if (replace || !cursor) {
            return payload.messages
          }
          return [...payload.messages, ...previous]
        })
        setMessagesCursor(payload.nextCursor || null)
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to load messages')
      } finally {
        if (!cursor) {
          setIsLoadingMessages(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    activeConversationRef.current = activeConversation
  }, [activeConversation])

  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      setMessagesCursor(null)
      return
    }
    loadMessages(activeConversation.id, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.id])

  // Real-time: connect socket.io and listen for updates
  useEffect(() => {
    if (!user?.id) return

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      query: { userId: user.id },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error', err)
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    const handleReceivedMessage = (payload) => {
      const { message, conversationId } = payload
      const currentActive = activeConversationRef.current
      
      if (currentActive && conversationId === currentActive.id) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === message.id)
          if (exists) {
            return prev
          }
          
          const optimisticIndex = prev.findIndex((msg) => {
            if (!msg.id.startsWith('temp-')) return false
            if (msg.sender.id !== message.sender.id) return false
            return msg.body.trim() === message.body.trim()
          })
          
          if (optimisticIndex !== -1) {
            const newMessages = [...prev]
            newMessages[optimisticIndex] = message
            return newMessages
          }
          
          return [...prev, message]
        })
        
        if (currentActive.id === conversationId) {
          setActiveConversation((prev) => {
            if (!prev || prev.id !== conversationId) return prev
            return {
              ...prev,
              lastMessage: message,
              updatedAt: message.createdAt,
            }
          })
        }
      } else {
        const updateFn = updateConversationInListRef.current
        if (updateFn) {
          updateFn(conversationId, {
            lastMessage: message,
            updatedAt: message.createdAt,
          })
        }
      }
    }

    socket.on('message:receive', handleReceivedMessage)
    socket.on('message:new', handleReceivedMessage)

    // Handle deleted messages from other clients
    socket.on('message:deleted', (payload) => {
      const { conversationId, messageId, lastMessage, updatedAt } = payload
      const currentActive = activeConversationRef.current

      // Remove from current message list if we're viewing this conversation
      if (currentActive && currentActive.id === conversationId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId))

        setActiveConversation((prev) => {
          if (!prev || prev.id !== conversationId) return prev
          return {
            ...prev,
            lastMessage: lastMessage || null,
            updatedAt: updatedAt || prev.updatedAt,
          }
        })
      }

      // Update conversation list preview
      const updateFn = updateConversationInListRef.current
      if (updateFn) {
        updateFn(conversationId, {
          lastMessage: lastMessage || null,
          updatedAt: updatedAt || new Date().toISOString(),
        })
      }
    })

    socket.on('conversation:updated', () => {
      // Conversation updated, but we don't need to reload
    })

    return () => {
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    if (activeConversation?.id) {
      socket.emit('join_conversation', activeConversation.id)
      return () => {
        socket.emit('leave_conversation', activeConversation.id)
      }
    }
  }, [activeConversation])

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [composerValue])

  const handleSendMessage = async (event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    if (!activeConversation || !composerValue.trim() || isSending) {
      return false
    }
    
    const messageText = composerValue.trim()
    const tempId = `temp-${Date.now()}-${Math.random()}`
    
    const optimisticMessage = {
      id: tempId,
      body: messageText,
      createdAt: new Date().toISOString(),
      sender: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        profilePicture: user?.profilePicture,
      },
    }
    
    setMessages((prev) => [...prev, optimisticMessage])
    setComposerValue('')
    setIsSending(true)
    setError('')

    const socket = socketRef.current
    if (!socket || !socket.connected) {
      setError('Not connected. Please refresh the page.')
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
      setIsSending(false)
      setComposerValue(messageText)
      return false
    }

    socket.emit(
      'message:send',
      {
        conversationId: activeConversation.id,
        body: messageText,
      },
      (response) => {
        setIsSending(false)
        if (!response || !response.ok) {
          setError(response?.error || 'Unable to send message')
          setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
          setComposerValue(messageText)
        } else {
          const updateFn = updateConversationInListRef.current
          if (updateFn) {
            updateFn(activeConversation.id, {
              lastMessage: optimisticMessage,
              updatedAt: optimisticMessage.createdAt,
            })
          }
        }
      }
    )
    
    return false
  }

  const hasMoreMessages = Boolean(messagesCursor)

  const activeConversationSubtitle = useMemo(() => {
    if (!activeConversation) return ''
    if (activeConversation.isGroup) {
      const onlineCount = activeConversation.participants.length // TODO: Get real online count
      return `${activeConversation.participants.length} Member${activeConversation.participants.length > 1 ? 's' : ''}, ${onlineCount} Online`
    }
    const other = activeConversation.participants.find(
      (participant) => participant.id !== user?.id
    )
    return other?.email || other?.name || ''
  }, [activeConversation, user?.id])

  const handleConversationCreated = (conversation) => {
    setConversations((prev) => {
      const existing = prev.filter((item) => item.id !== conversation.id)
      return [conversation, ...existing]
    })
    setActiveConversation(conversation)
    setMessages([])
    setShowNewChatModal(false)
  }

  const handleDeleteMessage = async (messageId) => {
    if (!activeConversation?.id) return

    const conversationId = activeConversation.id

    // Optimistically remove the message from the UI
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))

    try {
      await deleteMessage(conversationId, messageId)
      // Server will broadcast message:deleted to sync other clients and update sidebar
    } catch (err) {
      // On error, we can't easily restore the exact message here without extra state,
      // so for now we just show an error and rely on a reload if needed.
      console.error('Failed to delete message', err)
      setError(
        err.response?.data?.error ||
          'Unable to delete message. Please try again.'
      )
      // Optionally, reload messages for this conversation to restore state
      loadMessages(conversationId, { replace: true })
    }
  }

  // Group messages by date for date separators
  const groupedMessages = useMemo(() => {
    const groups = []
    let currentDate = null
    
    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt)
      const dateKey = messageDate.toDateString()
      
      if (dateKey !== currentDate) {
        currentDate = dateKey
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        
        let dateLabel = 'Today'
        if (dateKey === yesterday.toDateString()) {
          dateLabel = 'Yesterday'
        } else if (dateKey !== today.toDateString()) {
          dateLabel = messageDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric',
            year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
          })
        }
        
        groups.push({ type: 'date', label: dateLabel })
      }
      
      groups.push({ type: 'message', message })
    })
    
    return groups
  }, [messages])

  return (
    <div className="flex h-screen bg-[#F0F2F5]">
      {/* Left Sidebar */}
      <div className="w-[380px] bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="h-[60px] px-4 flex items-center justify-between border-b border-gray-200 bg-[#F0F2F5]">
          <div className="flex items-center gap-3">
            {user?.profilePicture ? (
              <img
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${user.profilePicture}`}
                alt={user.name || user.email}
                className="w-10 h-10 rounded-full object-cover cursor-pointer"
                onClick={() => setShowProfileModal(true)}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center font-semibold cursor-pointer"
                onClick={() => setShowProfileModal(true)}
              >
                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <h1 className="text-xl font-semibold text-[#41525D]">Messages</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <svg className="w-5 h-5 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <svg className="w-5 h-5 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Online Now Section */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#54656F]">Online Now</span>
            <button className="text-xs text-[#25D366] hover:underline">See All</button>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {conversations.slice(0, 5).map((conv) => {
              const other = conv.participants.find(p => p.id !== user?.id)
              return (
                <div key={conv.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div className="relative">
                    {other?.profilePicture ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${other.profilePicture}`}
                        alt={other.name || other.email}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center font-semibold border-2 border-white">
                        {(other?.name || other?.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#25D366] rounded-full border-2 border-white"></div>
                  </div>
                  <span className="text-xs text-[#54656F] truncate w-full text-center">
                    {other?.name || other?.email || 'User'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Pinned Message Section */}
        <div className="px-4 py-2 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-sm text-[#54656F]">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
            <span>Pinned Message</span>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 bg-white border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full pl-10 pr-4 py-2 bg-[#F0F2F5] rounded-lg border-0 focus:outline-none focus:ring-0 text-sm"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="flex items-center justify-center h-full text-[#54656F]">Loading chats...</div>
          ) : (
            <>
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversation?.id}
                onSelect={(conversation) => setActiveConversation(conversation)}
                searchTerm={conversationSearch}
                currentUserId={user?.id}
              />
            </>
          )}
        </div>
      </div>

      {/* Right Pane - Chat Window */}
      <div className="flex-1 flex flex-col bg-[#EFEAE2]">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-[60px] bg-[#F0F2F5] px-4 flex items-center justify-between border-b border-gray-200">
              <div className="flex items-center gap-3">
                {activeConversation.isGroup ? (
                  <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white font-semibold">
                    {activeConversation.title?.[0]?.toUpperCase() || 'G'}
                  </div>
                ) : (
                  (() => {
                    const other = activeConversation.participants.find(p => p.id !== user?.id)
                    return other?.profilePicture ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${other.profilePicture}`}
                        alt={other.name || other.email}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center font-semibold">
                        {(other?.name || other?.email || 'U')[0].toUpperCase()}
                      </div>
                    )
                  })()
                )}
                <div>
                  <p className="font-semibold text-[#111B21]">
                    {activeConversation.title || activeConversationSubtitle || 'Conversation'}
                  </p>
                  <p className="text-xs text-[#667781]">{activeConversationSubtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-2 bg-[#EFEAE2] bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern id=%22grid%22 width=%2260%22 height=%2260%22 patternUnits=%22userSpaceOnUse%22%3E%3Cpath d=%22M 60 0 L 0 0 0 60%22 fill=%22none%22 stroke=%22rgba(0,0,0,0.03)%22 stroke-width=%221%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22url(%23grid)%22/%3E%3C/svg%3E')]">
              {hasMoreMessages && (
                <button
                  onClick={() =>
                    loadMessages(activeConversation.id, {
                      cursor: messagesCursor,
                      replace: false,
                    })
                  }
                  className="mx-auto block my-2 text-xs text-[#54656F] hover:text-[#25D366]"
                >
                  Load previous
                </button>
              )}

              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full text-[#54656F]">Loading messages...</div>
              ) : (
                <div className="space-y-1">
                  {groupedMessages.map((item, index) => {
                    if (item.type === 'date') {
                      return (
                        <div key={`date-${index}`} className="flex items-center justify-center my-4">
                          <span className="px-3 py-1 bg-white/80 rounded-full text-xs text-[#54656F] font-medium">
                            {item.label}
                          </span>
                        </div>
                      )
                    }
                    const isOwn = item.message.sender.id === user?.id
                    return (
                      <MessageBubble
                        key={item.message.id}
                        message={item.message}
                        isOwn={isOwn}
                        onDelete={
                          isOwn
                            ? () => handleDeleteMessage(item.message.id)
                            : undefined
                        }
                      />
                    )
                  })}
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Message Input */}
            <div className="bg-[#F0F2F5] px-4 py-2 border-t border-gray-200">
              {error && (
                <div className="mb-2 text-xs text-red-600 px-2">{error}</div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  return handleSendMessage(e)
                }}
                className="flex items-end gap-2"
                noValidate
              >
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  title="Emoji"
                >
                  <svg className="w-6 h-6 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  title="Attach file"
                >
                  <svg className="w-6 h-6 text-[#54656F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <div className="flex-1 bg-white rounded-lg px-4 py-2 flex items-end">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={composerValue}
                    onChange={(e) => setComposerValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        e.stopPropagation()
                        if (activeConversation && composerValue.trim() && !isSending) {
                          handleSendMessage(e)
                          return false
                        }
                      }
                    }}
                    placeholder="Type message"
                    className="flex-1 resize-none bg-transparent border-0 outline-none text-sm text-[#111B21] placeholder:text-[#667781] max-h-[120px] overflow-y-auto"
                    style={{ minHeight: '24px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending || !composerValue.trim()}
                  className="p-2 bg-[#25D366] hover:bg-[#20BA5A] disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full transition-colors"
                  title="Send message"
                >
                  {isSending ? (
                    <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#EFEAE2]">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-xl font-semibold text-[#54656F] mb-2">WhatsApp Web</p>
              <p className="text-sm text-[#667781]">Select a chat or start a new one</p>
            </div>
          </div>
        )}
      </div>

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onCreated={handleConversationCreated}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  )
}

export default Dashboard
