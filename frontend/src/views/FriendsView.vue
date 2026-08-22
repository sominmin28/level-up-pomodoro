<template>
  <div class="friends-page">
    <h1>👥 친구</h1>

    <!-- Add Friend -->
    <div class="add-friend-card">
      <h2>친구 추가</h2>
      <div class="add-friend-form">
        <input v-model="searchEmail" type="email" placeholder="친구 이메일 입력" />
        <button @click="sendRequest" class="btn-primary" :disabled="sending">
          {{ sending ? '전송 중...' : '요청 보내기' }}
        </button>
      </div>
      <p v-if="addMsg" :class="['add-msg', addSuccess ? 'success' : 'error']">{{ addMsg }}</p>
    </div>

    <!-- Pending Requests -->
    <div v-if="pendingIncoming.length > 0" class="friends-section">
      <h2>📬 받은 친구 요청</h2>
      <div v-for="f in pendingIncoming" :key="f.id" class="friend-card pending">
        <div class="friend-avatar">{{ f.nickname[0] }}</div>
        <div class="friend-info">
          <div class="friend-name">{{ f.nickname }}</div>
          <div class="friend-sub">{{ f.email }}</div>
        </div>
        <div class="friend-actions">
          <button @click="acceptFriend(f)" class="btn-accept">✓ 수락</button>
          <button @click="rejectFriend(f)" class="btn-reject">✗ 거절</button>
        </div>
      </div>
    </div>

    <!-- Sent Requests -->
    <div v-if="pendingOutgoing.length > 0" class="friends-section">
      <h2>📤 보낸 친구 요청</h2>
      <div v-for="f in pendingOutgoing" :key="f.id" class="friend-card pending-out">
        <div class="friend-avatar">{{ f.nickname[0] }}</div>
        <div class="friend-info">
          <div class="friend-name">{{ f.nickname }}</div>
          <div class="friend-sub">요청 대기 중...</div>
        </div>
      </div>
    </div>

    <!-- Friends List -->
    <div class="friends-section">
      <h2>👫 친구 목록 ({{ acceptedFriends.length }})</h2>
      <div v-if="acceptedFriends.length === 0" class="empty-state">
        아직 친구가 없습니다. 친구를 추가해보세요!
      </div>
      <div v-for="f in acceptedFriends" :key="f.id" class="friend-card">
        <div class="friend-avatar">{{ f.nickname[0] }}</div>
        <div class="friend-info">
          <div class="friend-name">{{ f.nickname }} <span class="level-badge">Lv.{{ f.level }}</span></div>
          <div class="friend-stats">
            <span>🍅 이번 주 {{ f.weekly_pomodoros }}개</span>
            <span>⭐ 총 XP {{ f.xp + (f.level - 1) * 100 }}</span>
            <span>🔥 최고 {{ f.best_streak }}일 연속</span>
          </div>
        </div>
        <button @click="removeFriend(f)" class="btn-remove">삭제</button>
      </div>
    </div>

    <!-- My Stats for Comparison -->
    <div v-if="acceptedFriends.length > 0" class="compare-section">
      <h2>📊 친구 비교</h2>
      <table class="compare-table">
        <thead>
          <tr>
            <th>닉네임</th>
            <th>레벨</th>
            <th>이번 주</th>
            <th>총 XP</th>
            <th>연속</th>
          </tr>
        </thead>
        <tbody>
          <tr class="my-row">
            <td>{{ auth.user?.nickname }} (나)</td>
            <td>{{ auth.user?.level }}</td>
            <td>{{ myWeekly }}개</td>
            <td>{{ (auth.user?.xp || 0) + ((auth.user?.level || 1) - 1) * 100 }}</td>
            <td>-</td>
          </tr>
          <tr v-for="f in acceptedFriends" :key="f.id">
            <td>{{ f.nickname }}</td>
            <td>{{ f.level }}</td>
            <td>{{ f.weekly_pomodoros }}개</td>
            <td>{{ f.xp + (f.level - 1) * 100 }}</td>
            <td>{{ f.best_streak }}일</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

const friends = ref([])
const searchEmail = ref('')
const sending = ref(false)
const addMsg = ref('')
const addSuccess = ref(false)
const myWeekly = ref(0)

const pendingIncoming = computed(() => friends.value.filter(f => f.status === 'pending' && !f.is_requester))
const pendingOutgoing = computed(() => friends.value.filter(f => f.status === 'pending' && f.is_requester))
const acceptedFriends = computed(() => friends.value.filter(f => f.status === 'accepted'))

async function fetchFriends() {
  try {
    const res = await axios.get(API_BASE + '/friends')
    friends.value = res.data
  } catch (e) { /* offline */ }
}

async function fetchMyWeekly() {
  try {
    const res = await axios.get(API_BASE + '/pomodoro/stats')
    myWeekly.value = res.data.week?.pomodoros || 0
  } catch (e) {}
}

async function sendRequest() {
  if (!searchEmail.value) return
  sending.value = true
  addMsg.value = ''
  try {
    await axios.post(API_BASE + '/friends/request', { email: searchEmail.value })
    addSuccess.value = true
    addMsg.value = '친구 요청을 보냈습니다!'
    searchEmail.value = ''
    await fetchFriends()
  } catch (e) {
    addSuccess.value = false
    addMsg.value = e.response?.data?.error || '요청 실패'
  } finally {
    sending.value = false
  }
}

async function acceptFriend(f) {
  try {
    await axios.put(API_BASE + '/friends/' + f.id + '/accept')
    await fetchFriends()
  } catch (e) {}
}

async function rejectFriend(f) {
  try {
    await axios.put(API_BASE + '/friends/' + f.id + '/reject')
    friends.value = friends.value.filter(fr => fr.id !== f.id)
  } catch (e) {}
}

async function removeFriend(f) {
  try {
    await axios.delete(API_BASE + '/friends/' + f.id)
    friends.value = friends.value.filter(fr => fr.id !== f.id)
  } catch (e) {}
}

onMounted(() => {
  fetchFriends()
  fetchMyWeekly()
})
</script>
