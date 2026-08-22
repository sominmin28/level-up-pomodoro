<template>
  <div class="home-page">
    <!-- XP Bar -->
    <div class="xp-section">
      <div class="level-info">
        <span class="level-text">레벨 {{ auth.user?.level || 1 }}</span>
        <span class="xp-text">{{ auth.user?.xp || 0 }} / 100 XP</span>
      </div>

      <p v-if="timerNotice" class="timer-notice" :class="{ error: timerNoticeIsError }">
        {{ timerNotice }}
      </p>
      <div class="xp-bar">
        <div class="xp-fill" :style="{ width: (auth.user?.xp || 0) + '%' }"></div>
      </div>
    </div>

    <!-- Mode Tabs -->
    <div class="mode-tabs">
      <button :class="{ active: timer.mode === timer.MODE.FOCUS }" @click="switchMode(timer.MODE.FOCUS)">집중</button>
      <button :class="{ active: timer.mode === timer.MODE.BREAK }" @click="switchMode(timer.MODE.BREAK)">휴식</button>
      <button :class="{ active: timer.mode === timer.MODE.LONG_BREAK }" @click="switchMode(timer.MODE.LONG_BREAK)">긴 휴식</button>
    </div>

    <!-- Timer Circle -->
    <div class="timer-container">
      <div class="timer-ring" :class="{ 'is-focus': timer.mode === timer.MODE.FOCUS, 'is-break': timer.mode !== timer.MODE.FOCUS }">
        <svg viewBox="0 0 200 200" class="timer-svg">
          <circle cx="100" cy="100" r="90" class="ring-bg" />
          <circle cx="100" cy="100" r="90" class="ring-progress"
            :style="{ strokeDashoffset: strokeOffset }"
            :stroke="timer.mode === timer.MODE.FOCUS ? '#ef4444' : '#22c55e'" />
        </svg>
        <div class="timer-display">
          <div class="timer-time">{{ timer.minutes }}:{{ timer.seconds }}</div>
          <div class="timer-mode-label">{{ modeLabel }}</div>
        </div>
      </div>
    </div>

    <!-- Pomodoro dots -->
    <div class="pomodoro-dots">
      <span v-for="i in 4" :key="i" :class="{ filled: i <= (timer.pomodoroCount % 4 || (timer.pomodoroCount > 0 && timer.pomodoroCount % 4 === 0 ? 4 : 0)) }">🍅</span>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button @click="handleStop" class="btn-icon" :disabled="!timer.isRunning && timer.secondsLeft === getDuration()">⏹</button>
      <button @click="handleStartPause" class="btn-start" :class="{ paused: timer.isRunning }">
        {{ timer.isRunning ? '⏸ 일시정지' : '▶ 시작' }}
      </button>
      <button @click="handleSkip" class="btn-icon">⏭</button>
    </div>

    <!-- White noise controls (only during focus) -->
    <div v-if="timer.mode === timer.MODE.FOCUS" class="noise-section">
      <div class="noise-header">
        <span>🎵 백색소음</span>
        <label class="toggle">
          <input type="checkbox" v-model="noiseEnabled" @change="toggleNoise" />
          <span class="slider"></span>
        </label>
      </div>
      <div v-if="noiseEnabled" class="noise-options">
        <button v-for="n in noiseOptions" :key="n.id"
          :class="{ active: selectedNoise === n.id }"
          @click="selectNoise(n.id)">
          {{ n.icon }} {{ n.name }}
        </button>
      </div>
    </div>

    <!-- Level Up Modal -->
    <Transition name="modal">
      <div v-if="showLevelUp" class="modal-overlay" @click.self="closeLevelUp">
        <div class="modal level-up-modal">
          <div class="level-up-animation">🎉</div>
          <h2>레벨 업!</h2>
          <div class="new-level">레벨 {{ newLevel }}</div>
          <p class="ai-message" v-if="aiMessage">{{ aiMessage }}</p>
          <p class="ai-message loading" v-else>AI 메시지 생성 중...</p>
          <button @click="closeLevelUp" class="btn-primary">계속하기</button>
        </div>
      </div>
    </Transition>

    <!-- Pomodoro Complete Modal -->
    <Transition name="modal">
      <div v-if="showComplete" class="modal-overlay" @click.self="showComplete = false">
        <div class="modal complete-modal">
          <div class="complete-icon">✅</div>
          <h2>포모도로 완료!</h2>
          <p>+{{ lastXpEarned }} XP 획득</p>
          <p class="total-count">총 {{ auth.user?.total_pomodoros || 0 }}개 완료</p>
          <button @click="showComplete = false" class="btn-primary">확인</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useTimerStore } from '../stores/timer'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const timer = useTimerStore()
const auth = useAuthStore()

const showLevelUp = ref(false)
const showComplete = ref(false)
const newLevel = ref(1)
const aiMessage = ref('')
const lastXpEarned = ref(25)
const noiseEnabled = ref(false)
const selectedNoise = ref('rain')
const timerNotice = ref('')
const timerNoticeIsError = ref(false)

const noiseOptions = [
  { id: 'rain', name: '빗소리', icon: '🌧' },
  { id: 'wave', name: '파도소리', icon: '🌊' },
  { id: 'cafe', name: '카페음', icon: '☕' },
  { id: 'forest', name: '숲소리', icon: '🌲' },
]

// Audio context for white noise generation
let audioCtx = null
let noiseSource = null
let gainNode = null

const circumference = 2 * Math.PI * 90
const strokeOffset = computed(() => {
  return circumference - (timer.progress / 100) * circumference
})

const modeLabel = computed(() => {
  if (timer.mode === timer.MODE.FOCUS) return '집중 시간'
  if (timer.mode === timer.MODE.BREAK) return '짧은 휴식'
  return '긴 휴식'
})

function getDuration() {
  if (timer.mode === timer.MODE.FOCUS) return timer.focusDuration
  if (timer.mode === timer.MODE.BREAK) return timer.breakDuration
  return timer.longBreakDuration
}

function switchMode(m) {
  if (!timer.isRunning) {
    timer.mode = m
    timer.secondsLeft = getDuration()
  }
}

function handleStartPause() {
  if (timer.isRunning) {
    timer.pause()
    stopNoise()
  } else {
    timer.start()
    if (noiseEnabled.value && timer.mode === timer.MODE.FOCUS) {
      playNoise(selectedNoise.value)
    }
  }
}

function handleStop() {
  timer.stop()
  stopNoise()
}

function handleSkip() {
  timer.pause()
  stopNoise()
  if (timer.mode === timer.MODE.FOCUS) {
    timer.mode = timer.pomodoroCount % 4 === 3 ? timer.MODE.LONG_BREAK : timer.MODE.BREAK
  } else {
    timer.mode = timer.MODE.FOCUS
  }
  timer.secondsLeft = getDuration()
}

// Register timer completion callback
timer.onTimerEnd_register(async (result) => {
  stopNoise()
  timerNotice.value = ''
  if (result?.save_failed) {
    timerNoticeIsError.value = true
    timerNotice.value = result.error
    return
  }
  if (result) {
    if (result.saved_locally) {
      timerNoticeIsError.value = false
      timerNotice.value = '오프라인 개발 모드: 완료 기록과 XP가 이 기기에만 저장되었습니다.'
    }
    lastXpEarned.value = result.xp_earned || 25
    if (result.leveled_up) {
      newLevel.value = result.new_level
      showLevelUp.value = true
      aiMessage.value = ''
      try {
        const res = await api.post('/ai/levelup-message', {
          level: result.new_level,
          total_pomodoros: auth.user?.total_pomodoros,
        })
        aiMessage.value = res.data.message
      } catch (e) {
        aiMessage.value = '축하합니다! 레벨 ' + result.new_level + '에 도달하셨습니다. 꾸준한 노력이 빛을 발하고 있습니다.'
      }
    } else {
      showComplete.value = true
    }
  }
})

// Watch mode to stop noise during breaks
watch(() => timer.mode, (m) => {
  if (m !== timer.MODE.FOCUS) stopNoise()
  else if (timer.isRunning && noiseEnabled.value) playNoise(selectedNoise.value)
})

function closeLevelUp() {
  showLevelUp.value = false
}

function toggleNoise() {
  if (noiseEnabled.value && timer.isRunning && timer.mode === timer.MODE.FOCUS) {
    playNoise(selectedNoise.value)
  } else {
    stopNoise()
  }
}

function selectNoise(id) {
  selectedNoise.value = id
  if (noiseEnabled.value && timer.isRunning) {
    stopNoise()
    playNoise(id)
  }
}

function playNoise(type) {
  stopNoise()
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  gainNode = audioCtx.createGain()
  gainNode.gain.value = 0.3
  gainNode.connect(audioCtx.destination)

  const bufferSize = audioCtx.sampleRate * 2
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)

  if (type === 'rain') {
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5
  } else if (type === 'wave') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.sin(i * 0.001) * 0.3 * (Math.random() * 0.5 + 0.5)
    }
  } else if (type === 'cafe') {
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2
  } else {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15 * (1 + Math.sin(i * 0.0005))
    }
  }

  noiseSource = audioCtx.createBufferSource()
  noiseSource.buffer = buffer
  noiseSource.loop = true
  noiseSource.connect(gainNode)
  noiseSource.start()
}

function stopNoise() {
  if (noiseSource) {
    try { noiseSource.stop() } catch (e) { /* ignore */ }
    noiseSource = null
  }
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
}

onUnmounted(() => stopNoise())
</script>
