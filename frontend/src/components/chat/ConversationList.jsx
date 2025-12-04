import { memo } from 'react'

const getInitials = (name = '', email = '') => {
  if (name?.trim()) {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const formatPreviewTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const sameDay = date.getDate() === today.getDate() && 
                  date.getMonth() === today.getMonth() && 
                  date.getFullYear() === today.getFullYear()
  const isYesterday = date.getDate() === yesterday.getDate() && 
                      date.getMonth() === yesterday.getMonth() && 
                      date.getFullYear() === yesterday.getFullYear()
  
  if (sameDay) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }).replace(/\s(AM|PM)/i, ' $1').toUpperCase()
  } else if (isYesterday) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

const ConversationList = memo(({
  conversations,
  activeConversationId,
  onSelect,
  // searchTerm is now handled in the backend; we keep the prop for compatibility
  currentUserId,
  onDeleteConversation,
  hasMoreConversations,
  onLoadMore,
}) => {
  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-[#54656F]">
        <div className="text-3xl">💬</div>
        <div className="text-center">
          <p className="font-medium">No conversations yet</p>
          <p className="text-sm">Start a new chat to begin</p>
        </div>
      </div>
    )
  }

  // Separate pinned and regular conversations
  const pinnedConversations = conversations.filter(c => c.isPinned) // TODO: Add isPinned to schema
  const regularConversations = conversations.filter(c => !c.isPinned)

  return (
    <div>
      {pinnedConversations.length > 0 && (
        <ul className="space-y-0">
          {pinnedConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onSelect={onSelect}
              currentUserId={currentUserId}
              onDeleteConversation={onDeleteConversation}
            />
          ))}
        </ul>
      )}
      
      {pinnedConversations.length > 0 && regularConversations.length > 0 && (
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-xs text-[#54656F]">All Message</span>
          </div>
        </div>
      )}

      <ul className="space-y-0">
      {regularConversations.map((conversation) => (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeConversationId}
          onSelect={onSelect}
          currentUserId={currentUserId}
          onDeleteConversation={onDeleteConversation}
        />
      ))}
      </ul>
      
      {hasMoreConversations && onLoadMore && (
        <div className="px-4 py-3 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            className="text-sm text-[#25D366] hover:text-[#20BA5A] font-medium"
          >
            Load more conversations
          </button>
        </div>
      )}
    </div>
  )
})

const ConversationListItem = memo(({ conversation, isActive, onSelect, currentUserId, onDeleteConversation }) => {
  const lastMessage = conversation.lastMessage
  const unreadCount = conversation.unreadCount || 0 // TODO: Add unreadCount to schema
  const isTyping = false // TODO: Add typing indicator from WebSocket
  
  // Format preview text
  let preview = 'No messages yet'
  if (isTyping) {
    preview = `${lastMessage?.sender?.name || lastMessage?.sender?.email || 'Someone'} is Typing...`
  } else if (lastMessage) {
    const senderName = lastMessage.sender.name || lastMessage.sender.email || 'Someone'
    const messageBody = lastMessage.body.length > 60
      ? `${lastMessage.body.slice(0, 57)}...`
      : lastMessage.body
    preview = `${senderName}: ${messageBody}`
  }

  return (
    <li>
      <button
        onClick={() => onSelect(conversation)}
        className={`relative w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F5F6F6] ${
          isActive ? 'bg-[#E9EDEF]' : 'bg-white'
        }`}
      >
        <AvatarStack participants={conversation.participants} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={`font-medium text-[17px] truncate ${
              isActive ? 'text-[#111B21]' : 'text-[#111B21]'
            }`}>
              {conversation.title || conversation.participants.find(p => p.id !== currentUserId)?.name || 'Chat'}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#667781] whitespace-nowrap">
                {formatPreviewTime(conversation.updatedAt)}
              </span>
              {onDeleteConversation && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    if (window.confirm('Delete this chat and all its messages?')) {
                      onDeleteConversation(conversation)
                    }
                  }}
                  className="p-1 rounded-full hover:bg-gray-200 text-[#667781]"
                  title="Delete chat"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h.293l.853 9.36A2 2 0 007.138 17h5.724a2 2 0 001.992-1.64L15.707 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm2.618 4l-.75 8H9.132l-.75-8h3.236z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm truncate ${
              isTyping ? 'text-[#25D366] italic' : 'text-[#667781]'
            }`}>
              {preview}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {lastMessage && lastMessage.sender.id === currentUserId && (
                <svg className="w-4 h-4 text-[#53BDEB]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              )}
              {unreadCount > 0 && (
                <span className="bg-[#25D366] text-white text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </li>
  )
})

const AvatarStack = memo(({ participants = [] }) => {
  const avatars = participants.slice(0, 1) // Show single avatar for now

  if (avatars.length === 0) {
    return (
      <div className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center font-semibold shrink-0">
        U
      </div>
    )
  }

  return (
    <div className="relative shrink-0">
      {avatars.map((participant) => {
        return (
          <div key={participant.id} className="w-12 h-12 rounded-full overflow-hidden">
            <div className="w-full h-full bg-[#25D366] text-white flex items-center justify-center font-semibold">
              {getInitials(participant.name, participant.email)}
            </div>
          </div>
        )
      })}
    </div>
  )
})

export default ConversationList
