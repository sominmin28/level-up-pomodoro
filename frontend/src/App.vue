<template>
  <div id="app">
    <nav v-if="auth.isAuthenticated" class="navbar">
      <div class="nav-brand">🍅 Level Up Pomodoro</div>
      <div class="nav-links">
        <router-link to="/">타이머</router-link>
        <router-link to="/stats">통계</router-link>
        <router-link to="/friends">친구</router-link>
        <router-link to="/settings">설정</router-link>
      </div>
      <div class="nav-user">
        <span class="level-badge">Lv.{{ auth.user?.level }}</span>
        <span class="nickname">{{ auth.user?.nickname }}</span>
        <button @click="handleLogout" class="btn-logout">로그아웃</button>
      </div>
    </nav>
    <main :class="{ 'with-nav': auth.isAuthenticated }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
