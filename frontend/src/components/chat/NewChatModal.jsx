import { useEffect, useMemo, useState } from 'react'
import {
  createConversation,
  searchPeople as searchPeopleApi,
} from '../../api/chat'

const NewChatModal = ({ isOpen, onClose, onCreated }) => {
  const [selectedUsers, setSelectedUsers] = useState([])
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setSelectedUsers([])
      setQuery('')
      setTitle('')
      setInitialMessage('')
      setSuggestions([])
      setError('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([])
      return
    }

    let isCancelled = false
    setIsSearching(true)

    const timeout = setTimeout(async () => {
      try {
        const response = await searchPeopleApi(query)
        if (!isCancelled) {
          setSuggestions(response.data.users)
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Search error', err)
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false)
        }
      }
    }, 250)

    return () => {
      isCancelled = true
      clearTimeout(timeout)
    }
  }, [query])

  const handleSelectUser = (user) => {
    if (selectedUsers.some((item) => item.id === user.id)) {
      return
    }
    setSelectedUsers((prev) => [...prev, user])
    setQuery('')
    setSuggestions([])
  }

  const removeUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((user) => user.id !== userId))
  }

  const participantPreview = useMemo(
    () => selectedUsers.map((user) => user.name || user.email).join(', '),
    [selectedUsers]
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedUsers.length) {
      setError('Select at least one person to start chatting')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await createConversation({
        participantIds: selectedUsers.map((user) => user.id),
        title: title?.trim() || undefined,
        initialMessage: initialMessage?.trim() || undefined,
      })

      onCreated(response.data.conversation)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create conversation')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-lg font-semibold">Start a new chat</p>
            <p className="text-sm text-apple-gray">
              Apple-inspired, minimal and calm
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-apple-light px-4 py-2 text-sm font-medium text-apple-dark"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div>
            <label className="text-sm font-medium text-apple-gray">
              People
            </label>
            <div className="relative mt-2">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name or email"
                className="apple-input"
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-3 flex items-center text-apple-gray text-sm">
                  ...
                </div>
              )}
            </div>
            {!!selectedUsers.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-2 rounded-full bg-apple-light px-4 py-1 text-sm"
                  >
                    {user.name || user.email}
                    <button
                      type="button"
                      onClick={() => removeUser(user.id)}
                      className="text-xs text-apple-gray hover:text-black"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {!!suggestions.length && (
              <ul className="mt-3 space-y-1 rounded-2xl border border-gray-100 bg-white shadow-lg">
                {suggestions.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="flex w-full flex-col items-start gap-1 rounded-2xl px-4 py-3 text-left hover:bg-apple-light/60"
                    >
                      <span className="font-medium">{user.name || user.email}</span>
                      <span className="text-xs text-apple-gray">{user.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-apple-gray">
              Conversation title
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                participantPreview || 'e.g. Product Design Standup'
              }
              className="apple-input mt-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-apple-gray">
              First message
            </label>
            <textarea
              rows={3}
              value={initialMessage}
              onChange={(event) => setInitialMessage(event.target.value)}
              placeholder="What would you like to say?"
              className="apple-input mt-2 resize-none"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-apple-gray hover:text-black"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="apple-button"
            >
              {isSubmitting ? 'Creating...' : 'Create chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewChatModal

