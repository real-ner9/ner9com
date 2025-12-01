<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchExampleMessage } from '@/services/example.service'
import { getAudioStreamUrl, getThumbnailUrl } from '@/services/media.service'

const exampleMessage = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const driveFileId = ref('')
const audioSrc = computed(() => getAudioStreamUrl(driveFileId.value))
const thumbnailSrc = computed(() => getThumbnailUrl(driveFileId.value))

/**
 * Fetch demo data from the Fastify backend.
 */
async function loadExampleMessage() {
  errorMessage.value = null
  isLoading.value = true

  try {
    exampleMessage.value = await fetchExampleMessage()
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message
      return
    }
    errorMessage.value = 'Unknown API error'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadExampleMessage()
})
</script>

<template>
  <main>
    <h1>Main page</h1>
    <section class="api-block">
      <p class="section-title">Backend example response</p>

      <p v-if="isLoading" class="status">Loading from Fastify…</p>
      <p v-else-if="errorMessage" class="status error">{{ errorMessage }}</p>
      <p v-else class="status success">{{ exampleMessage }}</p>

      <button
        class="reload-button"
        type="button"
        :disabled="isLoading"
        @click="loadExampleMessage"
      >
        {{ isLoading ? 'Refreshing…' : 'Reload message' }}
      </button>
    </section>

    <section class="player-block">
      <p class="section-title">Google Drive player</p>
      <label class="input-label">
        Drive file ID
        <input
          v-model="driveFileId"
          class="file-input"
          type="text"
          placeholder="Paste Google Drive file ID"
        />
      </label>

      <div v-if="thumbnailSrc" class="preview">
        <img :src="thumbnailSrc" alt="Track artwork" loading="lazy" />
      </div>

      <audio
        v-if="audioSrc"
        class="audio-player"
        :src="audioSrc"
        controls
        preload="none"
      >
        Your browser does not support the audio element.
      </audio>

      <p class="hint">
        Make sure this file is shared with the service account before playing.
      </p>
    </section>
  </main>
</template>

<style scoped>
.api-block {
  margin-top: 24px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
}

.status {
  font-size: 16px;
}

.status.success {
  color: #4ade80;
}

.status.error {
  color: #f87171;
}

.reload-button {
  align-self: flex-start;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s;
}

.reload-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reload-button:not(:disabled):hover {
  border-color: #4ade80;
  transform: translateY(-1px);
}

.player-block {
  margin-top: 32px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: #cbd5f5;
}

.file-input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.4);
  color: inherit;
}

.preview img {
  max-width: 260px;
  border-radius: 8px;
}

.audio-player {
  width: 100%;
}

.hint {
  font-size: 13px;
  color: #94a3b8;
}
</style>
