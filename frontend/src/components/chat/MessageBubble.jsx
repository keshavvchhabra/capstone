const getInitials = (name = '', email = '') => {
  if (name?.trim()) {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const MessageBubble = ({ message, isOwn }) => {
  const messageDate = new Date(message.createdAt)
  const timestamp = messageDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(/\s(AM|PM)/i, ' $1').toUpperCase()

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
  const profilePic = message.sender.profilePicture
    ? `${API_URL}${message.sender.profilePicture}`
    : null

  return (
    <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
          {profilePic ? (
            <img
              src={profilePic}
              alt={message.sender.name || message.sender.email}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#25D366] text-white flex items-center justify-center text-xs font-semibold">
              {getInitials(message.sender.name, message.sender.email)}
            </div>
          )}
        </div>
      )}
      <div className={`flex flex-col max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="text-xs text-[#667781] mb-1 px-1">
            {message.sender.name || message.sender.email}
          </span>
        )}
        <div
          className={`rounded-lg px-3 py-2 shadow-sm ${
            isOwn
              ? 'bg-[#D9FDD3] rounded-tr-none'
              : 'bg-white rounded-tl-none'
          }`}
        >
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
            isOwn ? 'text-[#111B21]' : 'text-[#111B21]'
          }`}>
            {message.body}
          </p>
          <div className={`flex items-center justify-end gap-1 mt-1 ${
            isOwn ? 'text-[#667781]' : 'text-[#667781]'
          }`}>
            <span className="text-[11px]">{timestamp}</span>
            {isOwn && (
              <svg className="w-4 h-4 text-[#53BDEB]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
