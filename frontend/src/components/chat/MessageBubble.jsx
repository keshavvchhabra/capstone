import { useState } from 'react'

const getInitials = (name = '', email = '') => {
  if (name?.trim()) {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const MessageBubble = ({ message, isOwn, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.body)
  const [isUpdating, setIsUpdating] = useState(false)

  const messageDate = new Date(message.createdAt)
  const timestamp = messageDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(/\s(AM|PM)/i, ' $1').toUpperCase()

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(message.body)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(message.body)
  }

  const handleSave = async () => {
    if (!editValue.trim() || editValue.trim() === message.body) {
      setIsEditing(false)
      return
    }

    setIsUpdating(true)
    try {
      if (onUpdate) {
        await onUpdate(message, editValue.trim())
      }
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update message:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

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
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366] resize-none"
                rows={Math.min(editValue.split('\n').length, 5)}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-xs px-2 py-1 text-[#667781] hover:text-[#111B21]"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isUpdating || !editValue.trim()}
                  className="text-xs px-2 py-1 bg-[#25D366] text-white rounded hover:bg-[#20BA5A] disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p 
                className={`text-sm leading-relaxed whitespace-pre-wrap ${
                  isOwn ? 'text-[#111B21]' : 'text-[#111B21]'
                }`}
                onDoubleClick={isOwn && onUpdate ? handleEdit : undefined}
                style={isOwn && onUpdate ? { cursor: 'pointer' } : {}}
              >
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
              {isOwn && (
                <div className="absolute -top-2 -right-2 flex gap-1">
                  {onUpdate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit()
                      }}
                      className="p-1 rounded-full bg-white/80 hover:bg-gray-100 shadow cursor-pointer"
                      title="Edit message"
                    >
                      <svg className="w-3 h-3 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm('Delete this message for everyone?')) {
                          onDelete(message)
                        }
                      }}
                      className="p-1 rounded-full bg-white/80 hover:bg-red-50 shadow cursor-pointer"
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
