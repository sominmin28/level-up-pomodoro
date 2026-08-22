import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  function setAuth(t, u) {
    token.value = t
    user.value = u
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function updateUser(updates) {
    user.value = { ...user.value, ...updates }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    setAuth(res.data.token, res.data.user)
    return res.data
  }

  async function register(nickname, email, password) {
    const res = await api.post('/auth/register', { nickname, email, password })
    setAuth(res.data.token, res.data.user)
    return res.data
  }

  return { token, user, isAuthenticated, login, register, logout, updateUser, setAuth }
})
