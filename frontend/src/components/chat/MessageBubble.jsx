const getInitials = (name = '', email = '') => {
  if (name?.trim()) {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const MessageBubble = ({ message, isOwn, onDelete }) => {
  const messageDate = new Date(message.createdAt)
  const timestamp = messageDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(/\s(AM|PM)/i, ' $1').toUpperCase()

  return (
    <div className={`flex items-end gap-2 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
          <div className="w-full h-full bg-[#25D366] text-white flex items-center justify-center text-xs font-semibold">
            {getInitials(message.sender.name, message.sender.email)}
          </div>
        </div>
      )}
      <div className={`flex flex-col max-w-[65%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="text-xs text-[#667781] mb-1 px-1">
            {message.sender.name || message.sender.email}
          </span>
        )}
        <div
          className={`relative rounded-lg px-3 py-2 shadow-sm ${
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
          {isOwn && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm('Delete this message for everyone?')) {
                  onDelete(message)
                }
              }}
              className="absolute -top-2 -right-2 p-1 rounded-full bg-white/80 hover:bg-red-50 shadow cursor-pointer"
              title="Delete message"
            >
              <svg className="w-3 h-3 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 100 2h.293l.853 9.36A2 2 0 007.138 17h5.724a2 2 0 001.992-1.64L15.707 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm2.618 4l-.75 8H9.132l-.75-8h3.236z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
