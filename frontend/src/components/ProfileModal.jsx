import { useEffect, useState } from 'react'
import api from '../config/axios'
import { useAuth } from '../context/AuthContext'

const getInitials = (name = '', email = '') => {
  if (name?.trim()) {
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth()
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '')
      setError('')
      setSuccess('')
    }
  }, [isOpen, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const trimmedName = name.trim()
      const formData = new FormData()

      // Backend `/api/profile/me` expects multipart/form-data because of multer,
      // so we send a FormData payload even though we're only updating the name.
      if (trimmedName !== (user?.name || '')) {
        formData.append('name', trimmedName || '')
      }

      const response = await api.put('/api/profile/me', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      updateUser(response.data.user)
      setSuccess('Profile updated successfully')
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null
  const displayPicture = user?.profilePicture
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${user.profilePicture}`
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-lg font-semibold">Edit Profile</p>
            <p className="text-sm text-gray-500">Update your display name</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {/* Profile Avatar (read-only) */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {displayPicture ? (
                <img
                  src={displayPicture}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center text-3xl font-semibold border-4 border-white shadow-lg">
                  {getInitials(user?.name, user?.email)}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-500 text-center">
              Profile picture is currently read-only.
            </p>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full px-6 py-2 text-sm font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileModal

