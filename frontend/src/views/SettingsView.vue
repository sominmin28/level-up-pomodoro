<template>
  <div class="settings-page">
    <h1>⚙️ 설정</h1>

    <div class="settings-card">
      <h2>⏱ 타이머 설정</h2>

      <div class="setting-item">
        <label>집중 시간: <strong>{{ settings.focus_duration }}분</strong></label>
        <input type="range" v-model.number="settings.focus_duration" min="15" max="60" step="1" />
        <div class="range-labels"><span>15분</span><span>60분</span></div>
      </div>

      <div class="setting-item">
        <label>짧은 휴식: <strong>{{ settings.break_duration }}분</strong></label>
        <input type="range" v-model.number="settings.break_duration" min="1" max="15" step="1" />
        <div class="range-labels"><span>1분</span><span>15분</span></div>
      </div>

      <div class="setting-item">
        <label>긴 휴식: <strong>{{ settings.long_break_duration }}분</strong></label>
        <input type="range" v-model.number="settings.long_break_duration" min="5" max="30" step="1" />
        <div class="range-labels"><span>5분</span><span>30분</span></div>
      </div>
    </div>

    <div class="settings-card">
      <h2>🎵 백색소음 설정</h2>
      <div class="setting-item">
        <label>기본 소음 유형</label>
        <div class="noise-grid">
          <button v-for="n in noiseOptions" :key="n.id"
            :class="{ active: settings.white_noise_type === n.id }"
            @click="settings.white_noise_type = n.id">
            {{ n.icon }} {{ n.name }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="saveMsg" :class="['save-msg', saveSuccess ? 'success' : 'error']">{{ saveMsg }}</p>

    <button @click="saveSettings" class="btn-primary" :disabled="saving">
      {{ saving ? '저장 중...' : '설정 저장' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const settings = ref({
  focus_duration: auth.user?.focus_duration || 25,
  break_duration: auth.user?.break_duration || 5,
  long_break_duration: auth.user?.long_break_duration || 15,
  white_noise_type: auth.user?.white_noise_type || 'rain',
  white_noise_enabled: auth.user?.white_noise_enabled || false,
})

const saving = ref(false)
const saveMsg = ref('')
const saveSuccess = ref(false)

// Persist to localStorage immediately on change
function persistLocal() {
  const s = settings.value
  localStorage.setItem('timer_settings', JSON.stringify(s))
}

const noiseOptions = [
  { id: 'rain', name: '빗소리', icon: '🌧' },
  { id: 'wave', name: '파도소리', icon: '🌊' },
  { id: 'cafe', name: '카페음', icon: '☕' },
  { id: 'forest', name: '숲소리', icon: '🌲' },
]

async function saveSettings() {
  saving.value = true
  saveMsg.value = ''
  try {
    await axios.put(API_BASE + '/users/settings', settings.value)
    auth.updateUser(settings.value)
    persistLocal()
    saveSuccess.value = true
    saveMsg.value = '설정이 저장되었습니다!'
  } catch (e) {
    // Offline: save to localStorage
    auth.updateUser(settings.value)
    persistLocal()
    saveSuccess.value = true
    saveMsg.value = '로컬에 저장되었습니다'
  } finally {
    saving.value = false
    setTimeout(() => { saveMsg.value = '' }, 3000)
  }
}

onMounted(() => {
  const local = localStorage.getItem('timer_settings')
  if (local) {
    const parsed = JSON.parse(local)
    settings.value = { ...settings.value, ...parsed }
  }
})
</script>
