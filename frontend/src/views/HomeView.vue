<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  fetchLeaderboard,
  submitContestEntry,
  type LeaderboardSummary
} from '@/services/contest.service'
import { RouterLink } from 'vue-router'

const displayName = ref('')
const instagramHandle = ref('')
const telegramHandlesInput = ref('')
const contestError = ref<string | null>(null)
const contestSuccess = ref<string | null>(null)
const isSubmittingContest = ref(false)

const leaderboard = ref<LeaderboardSummary | null>(null)
const isLeaderboardLoading = ref(false)
const leaderboardError = ref<string | null>(null)

const leaderboardEntries = computed(() => leaderboard.value?.entries ?? [])
const totalParticipants = computed(() => leaderboard.value?.totalParticipants ?? 0)

async function loadLeaderboard() {
  isLeaderboardLoading.value = true
  leaderboardError.value = null
  try {
    leaderboard.value = await fetchLeaderboard()
  } catch (error) {
    leaderboardError.value =
      error instanceof Error ? error.message : 'Не удалось загрузить рейтинг'
  } finally {
    isLeaderboardLoading.value = false
  }
}

async function handleContestSubmit() {
  if (isSubmittingContest.value) return

  contestError.value = null
  contestSuccess.value = null

  const instagram = instagramHandle.value.trim()
  const alias = displayName.value.trim()
  const handles = telegramHandlesInput.value.trim()

  if (!alias || !instagram || !handles) {
    contestError.value = 'Заполни все поля'
    return
  }

  isSubmittingContest.value = true
  try {
    const response = await submitContestEntry({
      displayName: alias,
      instagramHandle: instagram,
      telegramHandles: handles
    })
    leaderboard.value = response.leaderboard
    telegramHandlesInput.value = ''
    contestSuccess.value = `Добавлено ${response.submission.addedHandles} • Пропущено ${response.submission.skippedHandles}`
  } catch (error) {
    contestError.value =
      error instanceof Error ? error.message : 'Не удалось отправить форму'
  } finally {
    isSubmittingContest.value = false
  }
}

onMounted(() => {
  void loadLeaderboard()
})
</script>

<template>
  <main class="page">
    <section class="contest-board">
      <header class="contest-header">
        <div>
          <p class="contest-badge">Доска позора</p>
          <h1 class="contest-title">HR Hunt</h1>
          <p class="contest-subtitle">
            Кто сольёт больше HR никнеймов — тот и забирает приз
          </p>
        </div>
        <div class="contest-total">
          <span class="contest-total-label">Участников</span>
          <strong>{{ totalParticipants }}</strong>
        </div>
      </header>

      <div class="contest-grid">
        <form class="contest-form" @submit.prevent="handleContestSubmit">
          <label class="contest-field">
            <span>Отображаемый ник</span>
            <input
              v-model="displayName"
              class="contest-input"
              name="displayName"
              placeholder="HR Slayer"
              autocomplete="off"
            />
          </label>

          <label class="contest-field">
            <span>Instagram ник</span>
            <input
              v-model="instagramHandle"
              class="contest-input"
              name="instagramHandle"
              placeholder="@nickname"
              autocomplete="off"
            />
          </label>

          <label class="contest-field">
            <span>Telegram ники HR</span>
            <textarea
              v-model="telegramHandlesInput"
              class="contest-textarea"
              name="telegramHandles"
              rows="5"
              placeholder="@hr_odin, @hr_dva @hr_tri"
            ></textarea>
          </label>

          <p class="contest-hint">
            Разделяй ники пробелом или запятой. Уже сохранённые ники не учитываются.
          </p>

          <div class="contest-feedback">
            <p v-if="contestError" class="status error">{{ contestError }}</p>
            <p v-else-if="contestSuccess" class="status success">{{ contestSuccess }}</p>
          </div>

          <button class="contest-submit" type="submit" :disabled="isSubmittingContest">
            {{ isSubmittingContest ? 'Отправляем...' : 'Сдать компромат' }}
          </button>
        </form>

        <div class="leaderboard-card">
          <div class="leaderboard-header">
            <h2>Топ 10 информаторов</h2>
            <button
              class="refresh-button"
              type="button"
              :disabled="isLeaderboardLoading"
              @click="loadLeaderboard"
            >
              Обновить
            </button>
          </div>

          <p v-if="leaderboardError" class="status error">{{ leaderboardError }}</p>
          <p v-else-if="isLeaderboardLoading" class="status">Загружаем рейтинг...</p>
          <p v-else-if="!leaderboardEntries.length" class="status">Список пока пуст</p>

          <ol v-else class="leaderboard-list">
            <li v-for="(entry, index) in leaderboardEntries" :key="entry.participantId">
              <span class="leaderboard-rank">#{{ index + 1 }}</span>
              <div class="leaderboard-info">
                <span class="leaderboard-handle">{{ entry.displayName }}</span>
                <span class="leaderboard-count">{{ entry.handlesCount }} ников</span>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <section class="library-cta">
      <div>
        <h2>Ищешь музыку?</h2>
        <p>Открой новую страницу «Music Library», чтобы копаться в Google Drive.</p>
      </div>
      <RouterLink class="library-link" to="/music">Перейти к библиотеке</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px;
}

.contest-board {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.6);
}

.contest-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.contest-badge {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fb923c;
}

.contest-title {
  margin: 0;
  font-size: 32px;
}

.contest-subtitle {
  margin: 6px 0 0;
  color: #cbd5f5;
}

.contest-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(37, 99, 235, 0.1);
}

.contest-total-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #bfdbfe;
}

.contest-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.contest-form,
.leaderboard-card {
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.7);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.contest-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #cbd5f5;
}

.contest-input,
.contest-textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.4);
  color: inherit;
  padding: 10px 12px;
  font-size: 14px;
  resize: none;
}

.contest-input:focus,
.contest-textarea:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3);
}

.contest-hint {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

.contest-feedback {
  min-height: 20px;
}

.contest-submit {
  border: none;
  border-radius: 12px;
  padding: 12px 18px;
  background: linear-gradient(90deg, #2563eb, #a855f7);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}

.contest-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.contest-submit:not(:disabled):hover {
  transform: translateY(-1px);
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.leaderboard-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.leaderboard-list li {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.leaderboard-rank {
  font-weight: 600;
  color: #f97316;
}

.leaderboard-info {
  display: flex;
  justify-content: space-between;
  flex: 1;
  gap: 12px;
}

.leaderboard-handle {
  font-weight: 600;
}

.leaderboard-count {
  font-size: 14px;
  color: #94a3b8;
}

.refresh-button {
  border-radius: 999px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.4);
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s;
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-button:not(:disabled):hover {
  border-color: #60a5fa;
}

.status {
  font-size: 14px;
  color: #cbd5f5;
}

.status.error {
  color: #f87171;
}

.status.success {
  color: #4ade80;
}

.library-cta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.4);
}

.library-link {
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, transform 0.2s;
}

.library-link:hover {
  border-color: #4ade80;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .contest-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .contest-total {
    align-self: stretch;
    flex-direction: row;
    justify-content: space-between;
  }

  .library-cta,
  .contest-board {
    padding: 18px;
  }

  .library-cta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
