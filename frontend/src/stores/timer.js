import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import api, { getApiErrorMessage, offlineMode } from '../services/api'

export const useTimerStore = defineStore('timer', () => {
  const auth = useAuthStore()

  const MODE = { FOCUS: 'focus', BREAK: 'break', LONG_BREAK: 'long_break' }

  const mode = ref(MODE.FOCUS)
  const isRunning = ref(false)
  const secondsLeft = ref(0)
  const pomodoroCount = ref(0)
  const sessionStartedAt = ref(null)

  let interval = null

  const focusDuration = computed(() => (auth.user?.focus_duration || 25) * 60)
  const breakDuration = computed(() => (auth.user?.break_duration || 5) * 60)
  const longBreakDuration = computed(() => (auth.user?.long_break_duration || 15) * 60)

  function getDuration() {
    if (mode.value === MODE.FOCUS) return focusDuration.value
    if (mode.value === MODE.BREAK) return breakDuration.value
    return longBreakDuration.value
  }

  function reset() {
    secondsLeft.value = getDuration()
  }

  function initTimer() {
    if (!isRunning.value) {
      secondsLeft.value = getDuration()
    }
  }

  function start() {
    if (isRunning.value) return
    if (secondsLeft.value === 0) secondsLeft.value = getDuration()
    if (mode.value === MODE.FOCUS) sessionStartedAt.value = new Date().toISOString()
    isRunning.value = true
    interval = setInterval(tick, 1000)
  }

  function pause() {
    isRunning.value = false
    clearInterval(interval)
  }

  function stop() {
    isRunning.value = false
    clearInterval(interval)
    secondsLeft.value = getDuration()
    sessionStartedAt.value = null
  }

  async function tick() {
    if (secondsLeft.value > 0) {
      secondsLeft.value--
    } else {
      clearInterval(interval)
      isRunning.value = false
      await onTimerEnd()
    }
  }

  const onTimerEndCallbacks = []
  function onTimerEnd_register(cb) { onTimerEndCallbacks.push(cb) }

  async function onTimerEnd() {
    if (mode.value === MODE.FOCUS) {
      pomodoroCount.value++
      const completedAt = new Date().toISOString()
      const duration = auth.user?.focus_duration || 25

      let result = null
      try {
        const res = await api.post('/pomodoro/complete', {
          started_at: sessionStartedAt.value,
          completed_at: completedAt,
          duration_minutes: duration,
        })
        result = res.data
        auth.updateUser({
          xp: res.data.new_xp,
          level: res.data.new_level,
          total_pomodoros: res.data.total_pomodoros,
        })
      } catch (e) {
        if (offlineMode && auth.user) {
          const user = auth.user
          let newXp = (user.xp || 0) + 25
          let newLevel = user.level || 1
          let leveledUp = false
          while (newXp >= 100) { newXp -= 100; newLevel++; leveledUp = true }
          const totalPomodoros = (user.total_pomodoros || 0) + 1
          auth.updateUser({ xp: newXp, level: newLevel, total_pomodoros: totalPomodoros })
          result = {
            new_xp: newXp,
            new_level: newLevel,
            leveled_up: leveledUp,
            xp_earned: 25,
            total_pomodoros: totalPomodoros,
            saved_locally: true,
          }
        } else {
          console.error('Failed to save completed pomodoro', e)
          result = {
            save_failed: true,
            error: getApiErrorMessage(e, '완료 기록을 서버에 저장하지 못했습니다. 네트워크 상태를 확인해 주세요.'),
          }
        }
      }

      onTimerEndCallbacks.forEach(cb => cb(result))

      // Switch to break
      if (pomodoroCount.value % 4 === 0) {
        mode.value = MODE.LONG_BREAK
      } else {
        mode.value = MODE.BREAK
      }
    } else {
      mode.value = MODE.FOCUS
    }
    secondsLeft.value = getDuration()
    sessionStartedAt.value = null
  }

  const minutes = computed(() => Math.floor(secondsLeft.value / 60).toString().padStart(2, '0'))
  const seconds = computed(() => (secondsLeft.value % 60).toString().padStart(2, '0'))
  const progress = computed(() => {
    const total = getDuration()
    return total > 0 ? ((total - secondsLeft.value) / total) * 100 : 0
  })

  // Initialize
  secondsLeft.value = focusDuration.value || 25 * 60

  return {
    mode, isRunning, secondsLeft, pomodoroCount, MODE,
    minutes, seconds, progress,
    start, pause, stop, reset, initTimer,
    onTimerEnd_register,
    focusDuration, breakDuration, longBreakDuration,
  }
})
