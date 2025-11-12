import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-xl font-semibold">Show App</div>
            <button
              onClick={handleLogout}
              className="apple-button-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-semibold mb-4">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-xl text-apple-gray">
            You're successfully authenticated
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="apple-card">
            <div className="text-2xl font-semibold mb-2">Profile</div>
            <p className="text-apple-gray mb-4">View and edit your profile</p>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-apple-gray">Email:</span>
                <div className="font-medium">{user?.email}</div>
              </div>
              {user?.name && (
                <div>
                  <span className="text-sm text-apple-gray">Name:</span>
                  <div className="font-medium">{user.name}</div>
                </div>
              )}
            </div>
          </div>

          <div className="apple-card">
            <div className="text-2xl font-semibold mb-2">Security</div>
            <p className="text-apple-gray mb-4">Manage your account security</p>
            <button className="apple-button-secondary text-sm">
              Update password
            </button>
          </div>

          <div className="apple-card">
            <div className="text-2xl font-semibold mb-2">Settings</div>
            <p className="text-apple-gray mb-4">Customize your experience</p>
            <button className="apple-button-secondary text-sm">
              Open settings
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard

