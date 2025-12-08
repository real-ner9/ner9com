<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useDrivePickerStore } from '@/stores/drive-picker'
import {
  useBreadcrumbs,
  encodeBreadcrumbPath,
  decodeBreadcrumbPath,
  type DriveBreadcrumb
} from '@/composables/useBreadcrumbs'
import { isDriveFolder, type DriveFile } from '@/services/drive.service'
import DriveBreadcrumbs from '@/components/drive-picker/DriveBreadcrumbs.vue'
import DrivePlayer from '@/components/drive-picker/DrivePlayer.vue'
import {
  fetchLeaderboard,
  submitContestEntry,
  type LeaderboardSummary
} from '@/services/contest.service'

const router = useRouter()
const route = useRoute()

const drivePickerStore = useDrivePickerStore()
const breadcrumbState = useBreadcrumbs()
const { filteredFiles, searchQuery, isLoading, errorMessage, selectedTrack } =
  storeToRefs(drivePickerStore)
const { breadcrumbs, canGoBack } = breadcrumbState

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

function resolveQueryValue(value: unknown) {
  if (Array.isArray(value)) return value[0]
  if (typeof value === 'string') return value
  return undefined
}

async function ensureRootQuery(path?: DriveBreadcrumb[]) {
  if (route.query.folderId || !drivePickerStore.rootFolderId) return
  const trail =
    path ??
    [
      {
        id: drivePickerStore.rootFolderId,
        name: drivePickerStore.rootFolderLabel
      }
    ]
  await router.replace({
    query: {
      ...route.query,
      folderId: drivePickerStore.rootFolderId,
      folderName: drivePickerStore.rootFolderLabel,
      path: encodeBreadcrumbPath(trail)
    }
  })
}

watch(
  () => [route.query.folderId, route.query.folderName, route.query.path],
  async ([folderIdRaw, folderNameRaw, pathRaw]) => {
    const folderIdFromQuery = resolveQueryValue(folderIdRaw)
    const folderNameFromQuery = resolveQueryValue(folderNameRaw)
    const decodedPath = decodeBreadcrumbPath(resolveQueryValue(pathRaw))

    if (!decodedPath.length && folderIdFromQuery === drivePickerStore.rootFolderId) {
      decodedPath.push({
        id: drivePickerStore.rootFolderId,
        name: folderNameFromQuery ?? drivePickerStore.rootFolderLabel
      })
    }

    if (!decodedPath.length) {
      await ensureRootQuery()
      return
    }

    const target = decodedPath[decodedPath.length - 1]
    const effectiveFolderId = target.id || folderIdFromQuery
    const effectiveFolderName = target.name || folderNameFromQuery || 'Folder'

    if (!effectiveFolderId) {
      await ensureRootQuery(decodedPath)
      return
    }

    breadcrumbState.setTrail(decodedPath)
    await drivePickerStore.loadFolder(effectiveFolderId, effectiveFolderName)
  },
  { immediate: true }
)

function handleFileClick(file: DriveFile) {
  if (isDriveFolder(file)) {
    breadcrumbState.append({ id: file.id, name: file.name })
    void router.push({
      query: {
        ...route.query,
        folderId: file.id,
        folderName: file.name,
        path: encodeBreadcrumbPath(breadcrumbs.value)
      }
    })
    return
  }

  drivePickerStore.setSelectedTrack(file)
}

function handleGoBack() {
  if (!canGoBack.value) return
  const newTrail = breadcrumbState.removeLast()
  const target = newTrail[newTrail.length - 1]
  void router.push({
    query: {
      ...route.query,
      folderId: target.id,
      folderName: target.name,
      path: encodeBreadcrumbPath(newTrail)
    }
  })
}
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

    <section class="library">
      <DrivePlayer :track="selectedTrack" />
      <section class="picker">
        <header class="picker-header">
          <div>
            <h1 class="title">Music picker</h1>
            <p class="subtitle">Найди альбом на Google Drive</p>
          </div>
          <button
            class="back-button"
            type="button"
            :disabled="!canGoBack"
            @click="handleGoBack"
          >
            Назад
          </button>
        </header>

        <DriveBreadcrumbs :breadcrumbs="breadcrumbs" />

        <div class="picker-controls">
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="Поиск по альбомам и трекам"
          />
        </div>

        <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>
        <p v-else-if="isLoading" class="status">Загрузка...</p>
        <p v-else-if="!filteredFiles.length" class="status">Ничего не найдено</p>

        <ul v-else class="file-list">
          <li
            v-for="file in filteredFiles"
            :key="file.id"
          >
            <button class="file-row" type="button" @click="handleFileClick(file)">
              <div class="file-text">
                <span class="file-name">{{ file.name }}</span>
                <span class="file-meta">
                  {{ isDriveFolder(file) ? 'Папка' : 'Трек' }}
                </span>
              </div>
            </button>
          </li>
        </ul>
      </section>
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

.library {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.4);
}

.picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.4);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
}

.back-button {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
}

.back-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.back-button:not(:disabled):hover {
  border-color: #4ade80;
  transform: translateY(-1px);
}

.picker-controls {
  display: flex;
  gap: 12px;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.4);
  color: inherit;
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

.file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.file-row:hover {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.file-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.file-name {
  font-size: 16px;
  font-weight: 500;
}

.file-meta {
  font-size: 12px;
  color: #94a3b8;
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

  .library,
  .contest-board {
    padding: 18px;
  }
}
</style>
