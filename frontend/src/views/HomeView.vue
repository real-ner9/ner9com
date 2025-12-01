<script setup lang="ts">
import { watch } from 'vue'
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

const router = useRouter()
const route = useRoute()

const drivePickerStore = useDrivePickerStore()
const breadcrumbState = useBreadcrumbs()
const { filteredFiles, searchQuery, isLoading, errorMessage, selectedTrack } =
  storeToRefs(drivePickerStore)
const { breadcrumbs, canGoBack } = breadcrumbState

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
  <main class="library">
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
  </main>
</template>

<style scoped>
.library {
  padding: 24px;
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
</style>
