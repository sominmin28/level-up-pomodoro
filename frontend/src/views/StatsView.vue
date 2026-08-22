<template>
  <div class="stats-page">
    <h1>📊 학습 통계</h1>

    <div v-if="loading" class="loading">통계 불러오는 중...</div>

    <div v-else>
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🍅</div>
          <div class="stat-value">{{ stats.today?.pomodoros || 0 }}</div>
          <div class="stat-label">오늘 포모도로</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏱</div>
          <div class="stat-value">{{ formatMinutes(stats.today?.focus_minutes || 0) }}</div>
          <div class="stat-label">오늘 집중 시간</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-value">{{ stats.week?.pomodoros || 0 }}</div>
          <div class="stat-label">이번 주 포모도로</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">{{ stats.best_streak || 0 }}일</div>
          <div class="stat-label">최고 연속</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">{{ auth.user?.total_pomodoros || 0 }}</div>
          <div class="stat-label">총 누적 포모도로</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-value">{{ formatMinutes(auth.user?.total_focus_minutes || 0) }}</div>
          <div class="stat-label">총 집중 시간</div>
        </div>
      </div>

      <!-- Weekly Bar Chart -->
      <div class="chart-section">
        <h2>📈 이번 주 일별 포모도로</h2>
        <div class="bar-chart">
          <div v-for="day in weekDays" :key="day.label" class="bar-item">
            <div class="bar-fill" :style="{ height: getBarHeight(day.count) + 'px' }">
              <span class="bar-value" v-if="day.count > 0">{{ day.count }}</span>
            </div>
            <div class="bar-label">{{ day.label }}</div>
          </div>
        </div>
      </div>

      <!-- Hourly Chart -->
      <div class="chart-section">
        <h2>⏰ 시간대별 생산성</h2>
        <div class="hourly-chart">
          <div v-for="h in hourlyData" :key="h.hour" class="hour-item">
            <div class="hour-bar" :style="{ height: getHourHeight(h.count) + 'px' }"
              :class="{ peak: h.hour === peakHour }"></div>
            <div class="hour-label">{{ h.hour }}시</div>
          </div>
        </div>
        <p v-if="peakHour !== null" class="peak-info">
          🌟 가장 생산적인 시간대: <strong>{{ peakHour }}시 ~ {{ peakHour + 1 }}시</strong>
        </p>
      </div>

      <!-- AI Analysis -->
      <div class="ai-section">
        <h2>🤖 AI 통계 분석</h2>
        <div v-if="aiAnalysis" class="ai-analysis">
          <p>{{ aiAnalysis }}</p>
        </div>
        <button v-else @click="getAIAnalysis" class="btn-primary" :disabled="analysisLoading">
          {{ analysisLoading ? '분석 중...' : 'AI 분석 받기' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const auth = useAuthStore()

const stats = ref({ today: {}, week: {}, best_streak: 0, hourly: [], daily: [] })
const loading = ref(true)
const aiAnalysis = ref('')
const analysisLoading = ref(false)

const dayNames = ['일', '월', '화', '수', '목', '금', '토']

const weekDays = computed(() => {
  const days = []
  const dailyMap = {}
  ;(stats.value.daily || []).forEach(d => { dailyMap[d.date] = d.count })
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({ label: dayNames[d.getDay()], count: dailyMap[dateStr] || 0 })
  }
  return days
})

const hourlyData = computed(() => {
  const map = {}
  ;(stats.value.hourly || []).forEach(h => { map[h.hour] = h.count })
  return Array.from({ length: 24 }, (_, i) => ({ hour: i, count: map[i] || 0 }))
})

const peakHour = computed(() => {
  const data = hourlyData.value
  if (data.every(h => h.count === 0)) return null
  return data.reduce((max, h) => (h.count > max.count ? h : max), data[0]).hour
})

const maxBarCount = computed(() => Math.max(...weekDays.value.map(d => d.count), 1))
const maxHourCount = computed(() => Math.max(...hourlyData.value.map(h => h.count), 1))

function getBarHeight(count) { return (count / maxBarCount.value) * 120 }
function getHourHeight(count) { return Math.max((count / maxHourCount.value) * 80, 2) }

function formatMinutes(minutes) {
  if (minutes >= 60) return Math.round(minutes / 60) + 'h'
  return minutes + 'm'
}

async function fetchStats() {
  try {
    const res = await api.get('/pomodoro/stats')
    stats.value = res.data
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function getAIAnalysis() {
  analysisLoading.value = true
  try {
    const res = await api.post('/ai/stats-analysis', {
      stats: { ...stats.value, peak_hour: peakHour.value }
    })
    aiAnalysis.value = res.data.analysis
  } catch (e) {
    aiAnalysis.value = '오늘도 열심히 집중하셨네요! 꾸준한 포모도로 세션이 성과를 만들어냅니다.'
  } finally {
    analysisLoading.value = false
  }
}

onMounted(fetchStats)
</script>
