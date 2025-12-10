<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { searchMusicFiles, getThumbnailUrl, type DriveFile } from '@/services/drive.service'
import { useDrivePickerStore } from '@/stores/drive-picker'
import { usePlayerStore } from '@/stores/player'

const drivePickerStore = useDrivePickerStore()
const playerStore = usePlayerStore()

const query = ref('')
const results = ref<DriveFile[]>([])
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const isFocused = ref(false)

const dropdownVisible = computed(() => isFocused.value && (query.value.trim().length >= 2 || isLoading.value))
const hasResults = computed(() => results.value.length > 0)

const abortController = ref<AbortController | null>(null)
let blurTimeout: ReturnType<typeof setTimeout> | null = null

const runSearch = useDebounceFn(async () => {
  const folderId = drivePickerStore.rootFolderId.trim()
  const term = query.value.trim()

  if (!folderId || term.length < 2) {
    results.value = []
    errorMessage.value = null
    isLoading.value = false
    abortController.value?.abort()
    return
  }

  abortController.value?.abort()
  const localController = new AbortController()
  abortController.value = localController

  isLoading.value = true
  errorMessage.value = null

  try {
    const response = await searchMusicFiles(
      {
        folderId,
        query: term,
        pageSize: 8
      },
      { signal: localController.signal }
    )
    results.value = response.files
  } catch (error) {
    if (localController.signal.aborted) return
    results.value = []
    errorMessage.value =
      error instanceof Error ? error.message : 'Не удалось выполнить поиск'
  } finally {
    if (!localController.signal.aborted) {
      isLoading.value = false
    }
  }
}, 250)

watch(
  () => query.value,
  () => {
    void runSearch()
  }
)

function handleFocus() {
  if (blurTimeout) {
    clearTimeout(blurTimeout)
    blurTimeout = null
  }
  isFocused.value = true
}

function handleBlur() {
  blurTimeout = setTimeout(() => {
    isFocused.value = false
  }, 150)
}

function handleSelect(track: DriveFile) {
  playerStore.playTrack(track)
  query.value = track.name
  results.value = []
  isFocused.value = false
}

onBeforeUnmount(() => {
  abortController.value?.abort()
  if (blurTimeout) {
    clearTimeout(blurTimeout)
  }
})
</script>

<template>
  <div class="mini-search">
    <label class="mini-search__label">
      <span>Track search</span>
      <input
        v-model="query"
        class="mini-search__input"
        placeholder="Ищи треки в MUSIC"
        autocomplete="off"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </label>

    <div
      v-if="dropdownVisible"
      class="mini-search__dropdown"
    >
      <p v-if="isLoading" class="mini-search__status">Ищем...</p>
      <p v-else-if="errorMessage" class="mini-search__status mini-search__status--error">
        {{ errorMessage }}
      </p>
      <p
        v-else-if="!hasResults"
        class="mini-search__status"
      >
        Ничего не найдено
      </p>

      <ul v-else class="mini-search__results">
        <li
          v-for="file in results"
          :key="file.id"
        >
          <button class="mini-search__result" type="button" @mousedown.prevent @click="handleSelect(file)">
            <img
              v-if="file.thumbnailLink"
              :src="getThumbnailUrl(file.id)"
              alt=""
              class="mini-search__cover"
              loading="lazy"
            />
            <div v-else class="mini-search__cover mini-search__cover--fallback">
              ♪
            </div>
            <div class="mini-search__result-text">
              <span class="mini-search__name">{{ file.name }}</span>
              <span class="mini-search__meta">Трек</span>
            </div>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.mini-search {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.mini-search__label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.mini-search__input {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.5);
  color: #e2e8f0;
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.mini-search__input:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3);
}

.mini-search__dropdown {
  position: absolute;
  right: 0;
  left: 0;
  top: calc(100% + 6px);
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 15px 40px rgba(15, 23, 42, 0.35);
  z-index: 12;
}

.mini-search__status {
  margin: 0;
  color: #cbd5f5;
  font-size: 13px;
}

.mini-search__status--error {
  color: #fb7185;
}

.mini-search__results {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-search__result {
  width: 100%;
  border: none;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.6);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s, transform 0.2s;
}

.mini-search__result:hover {
  background: rgba(124, 58, 237, 0.2);
  transform: translateX(2px);
}

.mini-search__cover {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.mini-search__cover--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: rgba(79, 70, 229, 0.3);
}

.mini-search__result-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.mini-search__name {
  font-size: 14px;
  font-weight: 600;
}

.mini-search__meta {
  font-size: 12px;
  color: #94a3b8;
}
</style>
