<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">🍅</div>
      <h1>Level Up Pomodoro</h1>
      <p class="auth-subtitle">집중하고, 레벨업하세요</p>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>이메일</label>
          <input v-model="email" type="email" placeholder="email@example.com" required />
        </div>
        <div class="form-group">
          <label>비밀번호</label>
          <input v-model="password" type="password" placeholder="비밀번호" required />
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? '로그인 중...' : '로그인' }}
        </button>
      </form>
      <p class="auth-switch">계정이 없으신가요? <router-link to="/register">회원가입</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error || '로그인에 실패했습니다'
  } finally {
    loading.value = false
  }
}
</script>
