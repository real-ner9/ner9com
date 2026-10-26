<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { ReviewImage } from '@/types/review'

// Thumbnails of a review's or reply's images; a tap opens the full one over the page.
defineProps<{ images: ReviewImage[] }>()

const open = ref<ReviewImage | null>(null)

const onKey = (event: KeyboardEvent) => event.key === 'Escape' && (open.value = null)
watch(open, (image) => {
  if (image) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <ul v-if="images.length" class="grid" :class="{ 'grid--single': images.length === 1 }">
    <li v-for="image in images" :key="image.id">
      <button type="button" class="grid__thumb" :aria-label="$t('reviews.openImage')" @click="open = image">
        <img :src="image.thumbUrl" :width="image.width" :height="image.height" alt="" loading="lazy" />
      </button>
    </li>
  </ul>

  <Teleport to="body">
    <div v-if="open" class="lightbox" role="dialog" @click="open = null">
      <img :src="open.url" :width="open.width" :height="open.height" alt="" />
      <button type="button" class="lightbox__close" :aria-label="$t('reviews.close')">✕</button>
    </div>
  </Teleport>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 6px;
  padding: 0;
  list-style: none;
}

.grid--single {
  grid-template-columns: minmax(0, 260px);
}

.grid__thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
  cursor: zoom-in;
}

.grid--single .grid__thumb {
  aspect-ratio: auto;
}

.grid__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.85);
  cursor: zoom-out;
}

.lightbox img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.lightbox__close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}
</style>
