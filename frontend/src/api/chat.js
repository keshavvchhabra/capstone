import api from '../config/axios'

export const fetchConversations = (params = {}) =>
  api.get('/api/chats', { params })

export const createConversation = (payload) =>
  api.post('/api/chats', payload)

export const fetchMessages = (conversationId, params = {}) =>
  api.get(`/api/chats/${conversationId}/messages`, { params })

export const postMessage = (conversationId, body) =>
  api.post(`/api/chats/${conversationId}/messages`, { body })

export const deleteMessage = (conversationId, messageId) =>
  api.delete(`/api/chats/${conversationId}/messages/${messageId}`)

export const deleteConversation = (conversationId) =>
  api.delete(`/api/chats/${conversationId}`)

export const searchPeople = (query) =>
  api.get('/api/users/search', { params: { query } })

