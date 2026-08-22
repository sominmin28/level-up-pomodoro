import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error('VITE_API_URL is required for production builds')
}

export const offlineMode = import.meta.env.DEV && import.meta.env.VITE_OFFLINE_MODE === 'true'

const api = axios.create({
  baseURL: (configuredApiUrl || 'http://localhost:3001/api').replace(/\/+$/, ''),
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function getApiErrorMessage(error, fallback) {
  return error.response?.data?.error || fallback
}

export default api
