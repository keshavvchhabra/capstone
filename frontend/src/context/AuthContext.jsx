import { createContext, useState, useContext, useEffect } from 'react'
import api from '../config/axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await api.get('/api/auth/me')
      setUser(response.data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', { email, password })
      const { token: newToken, user: userData } = response.data
      setToken(newToken)
      setUser(userData)
      localStorage.setItem('token', newToken)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      }
    }
  }

  const register = async (email, password, name) => {
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        name
      })
      const { token: newToken, user: userData } = response.data
      setToken(newToken)
      setUser(userData)
      localStorage.setItem('token', newToken)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

