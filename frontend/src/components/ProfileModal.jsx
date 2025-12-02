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
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '')
      setError('')
      setSuccess('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [isOpen, user])

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setIsSubmittingProfile(true)
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
      setIsSubmittingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setIsSubmittingPassword(true)
    setError('')
    setSuccess('')

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setError('Please fill in all password fields')
        setIsSubmittingPassword(false)
        return
      }

      if (newPassword.length < 8) {
        setError('New password must be at least 8 characters long')
        setIsSubmittingPassword(false)
        return
      }

      if (newPassword !== confirmPassword) {
        setError('New password and confirmation do not match')
        setIsSubmittingPassword(false)
        return
      }

      await api.put('/api/profile/me/password', {
        currentPassword,
        newPassword,
      })

      setSuccess('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password')
    } finally {
      setIsSubmittingPassword(false)
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

        <form onSubmit={handleProfileSubmit} className="space-y-6 px-6 py-6">
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
              disabled={isSubmittingProfile}
              className="rounded-full px-6 py-2 text-sm font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmittingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Change Password Section */}
        <div className="border-t border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Change password</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700">
                {success}
              </div>
            )}

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="rounded-full px-4 py-2 text-xs font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmittingPassword ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfileModal

