<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-logo">🍅</div>
      <h1>회원가입</h1>
      <p class="auth-subtitle">새로운 집중 여정을 시작하세요</p>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>닉네임</label>
          <input v-model="nickname" type="text" placeholder="닉네임" required />
        </div>
        <div class="form-group">
          <label>이메일</label>
          <input v-model="email" type="email" placeholder="email@example.com" required />
        </div>
        <div class="form-group">
          <label>비밀번호</label>
          <input v-model="password" type="password" placeholder="6자 이상" minlength="6" required />
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? '가입 중...' : '회원가입' }}
        </button>
      </form>
      <p class="auth-switch">이미 계정이 있으신가요? <router-link to="/login">로그인</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const nickname = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(nickname.value, email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error || '회원가입에 실패했습니다'
  } finally {
    loading.value = false
  }
}
</script>
