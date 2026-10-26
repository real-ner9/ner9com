<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { uploadImage } from '@/api/reviews'
import type { ReviewImage } from '@/types/review'

/**
 * The image for a review or reply: uploaded right away when picked (the server re-encodes it to
 * webp), the form then sends only its id. One per post, like the backend (MAX_IMAGES).
 */
const MAX = 1

const images = defineModel<ReviewImage[]>({ required: true })
const { t } = useI18n()

const input = ref<HTMLInputElement | null>(null)
const uploading = ref(0)
const error = ref<string | null>(null)

async function onPick(event: Event) {
  const files = [...((event.target as HTMLInputElement).files ?? [])]
  ;(event.target as HTMLInputElement).value = ''
  error.value = null
  const room = MAX - images.value.length - uploading.value
  if (files.length > room) error.value = t('reviews.maxImages', { n: MAX })
  for (const file of files.slice(0, Math.max(room, 0))) {
    uploading.value += 1
    try {
      images.value = [...images.value, await uploadImage(file)]
    } catch (e) {
      error.value = t('reviews.uploadFailed', { message: e instanceof Error ? e.message : '' })
    } finally {
      uploading.value -= 1
    }
  }
}

const remove = (id: string) => (images.value = images.value.filter((image) => image.id !== id))
</script>

<template>
  <div class="picker">
    <ul v-if="images.length || uploading" class="picker__list">
      <li v-for="image in images" :key="image.id" class="picker__item">
        <img :src="image.thumbUrl" alt="" />
        <button
          type="button"
          class="picker__remove"
          :aria-label="$t('reviews.removeImage')"
          @click="remove(image.id)"
        >
          ✕
        </button>
      </li>
      <li v-for="n in uploading" :key="`up-${n}`" class="picker__item picker__item--loading">
        {{ $t('reviews.uploading') }}
      </li>
    </ul>
    <button
      v-if="images.length + uploading < MAX"
      type="button"
      class="picker__add"
      @click="input?.click()"
    >
      📎 {{ $t('reviews.attach') }}
    </button>
    <input ref="input" type="file" accept="image/*" :multiple="MAX > 1" hidden @change="onPick" />
    <p v-if="error" class="status status--error">{{ error }}</p>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  list-style: none;
}

.picker__item {
  position: relative;
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  font-size: 11px;
}

.picker__item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.picker__remove {
  position: absolute;
  top: 3px;
  right: 3px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
}

.picker__add {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 14px;
  cursor: pointer;
}
</style>
