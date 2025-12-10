<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import DrivePlayer from '@/components/drive-picker/DrivePlayer.vue'
import CoverFlow from '@/components/music/CoverFlow.vue'

const libraryStore = useLibraryStore()
const playerStore = usePlayerStore()

const { albums, selectedAlbum, selectedTracks, selectedAlbumId, isLoading, errorMessage } =
  storeToRefs(libraryStore)
const { currentTrack } = storeToRefs(playerStore)

onMounted(() => {
  void libraryStore.loadAlbums()
})

watch(
  () => selectedAlbumId.value,
  async (albumId) => {
    if (albumId) {
      await libraryStore.loadAlbumTracks(albumId)
    }
  },
  { immediate: true },
)

function handleAlbumSelect(album: { id: string }) {
  libraryStore.selectAlbum(album.id)
  void libraryStore.loadAlbumTracks(album.id)
}

function handleTrackClick(index: number) {
  if (!selectedTracks.value.length) return
  playerStore.playAlbum(selectedTracks.value, index, selectedAlbum.value ?? undefined)
}

function handleEnded() {
  playerStore.playNext()
}
</script>

<template>
  <main class="library-page">
    <section class="library">
      <DrivePlayer :track="currentTrack" @ended="handleEnded" />

      <section class="picker">
        <header class="picker-header">
          <div>
            <h1 class="title">Music Library</h1>
            <p class="subtitle">Локальные альбомы и треки</p>
          </div>
        </header>

        <p v-if="errorMessage" class="status error">{{ errorMessage }}</p>
        <p v-else-if="isLoading" class="status">Загрузка...</p>
        <p v-else-if="!albums.length" class="status">Нет альбомов</p>

        <template v-else>
          <CoverFlow :albums="albums" :active-id="selectedAlbumId" @select="handleAlbumSelect" />

          <div class="tracks" v-if="selectedTracks.length">
            <header class="tracks__header">
              <div>
                <p class="tracks__label">Альбом</p>
                <p class="tracks__title">{{ selectedAlbum?.name }}</p>
              </div>
              <p class="tracks__meta">{{ selectedTracks.length }} трек(ов)</p>
            </header>

            <ul class="track-list">
              <li v-for="(track, index) in selectedTracks" :key="track.id">
                <button class="track-row" type="button" @click="handleTrackClick(index)">
                  <div class="track-row__text">
                    <span class="track-row__index">#{{ index + 1 }}</span>
                    <span class="track-row__title">{{ track.title }}</span>
                  </div>
                </button>
              </li>
            </ul>
          </div>
        </template>
      </section>
    </section>
  </main>
</template>

<style scoped>
.library-page {
  padding: 24px;
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
  gap: 16px;
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

.status {
  font-size: 14px;
  color: #cbd5f5;
}

.status.error {
  color: #f87171;
}

.tracks {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tracks__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tracks__label {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.tracks__title {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 600;
}

.tracks__meta {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

.track-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.track-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.track-row:hover {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.05);
}

.track-row__text {
  display: flex;
  align-items: center;
  gap: 10px;
}

.track-row__index {
  font-size: 12px;
  color: #94a3b8;
}

.track-row__title {
  font-size: 15px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .library-page {
    padding: 18px;
  }

  .library {
    padding: 18px;
  }
}
</style>
