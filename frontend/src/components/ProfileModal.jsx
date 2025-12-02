import { useEffect, useState, useRef } from 'react'
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
  const [profilePicture, setProfilePicture] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '')
      setProfilePicture(null)
      setPreview(user.profilePicture ? `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${user.profilePicture}` : null)
      setError('')
      setSuccess('')
    }
  }, [isOpen, user])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setError('')
    setProfilePicture(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePicture = async () => {
    if (!user?.profilePicture && !preview) return

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await api.delete('/api/profile/me/picture')
      updateUser(response.data.user)
      setPreview(null)
      setProfilePicture(null)
      setSuccess('Profile picture removed successfully')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove profile picture')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      if (name.trim() !== (user?.name || '')) {
        formData.append('name', name.trim() || '')
      }
      if (profilePicture) {
        formData.append('profilePicture', profilePicture)
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

  const displayPicture = preview || (user?.profilePicture ? `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${user.profilePicture}` : null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-lg font-semibold">Edit Profile</p>
            <p className="text-sm text-gray-500">Update your name and profile picture</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          {/* Profile Picture */}
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg hover:bg-[#1D4ED8] transition-colors"
                title="Change profile picture"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="mt-3 text-xs text-gray-500 text-center">
              Click the camera icon to change your profile picture
            </p>
            {displayPicture && (
              <button
                type="button"
                onClick={handleRemovePicture}
                disabled={isSubmitting}
                className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors disabled:text-gray-400"
              >
                Remove picture
              </button>
            )}
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

