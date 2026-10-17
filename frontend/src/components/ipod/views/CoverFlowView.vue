<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useIpodStore } from '@/stores/ipod'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR } from '@/types/ipod'

const nav = inject(IPOD_NAVIGATOR)!
const library = useLibraryStore()
const { albums, isLoading } = storeToRefs(library)
const { album: playingAlbum } = storeToRefs(usePlayerStore())

const VISIBLE_SIDE = 4 // covers rendered on each side of the centered one
const SWIPE_STEP_PX = 36

const ipod = useIpodStore()
const selected = ref(
  ipod.coverFlowIndex ??
    Math.max(
      0,
      albums.value.findIndex((a) => a.id === playingAlbum.value?.id),
    ),
)
watch(selected, (index) => (ipod.coverFlowIndex = index))
const current = computed(() => albums.value[selected.value] ?? null)

function clamp(index: number) {
  return Math.min(Math.max(index, 0), Math.max(albums.value.length - 1, 0))
}

/** Positions a cover by its distance from the center, like the real Cover Flow. */
function coverStyle(index: number) {
  const offset = index - selected.value
  if (offset === 0) return { transform: 'translateX(-50%)', zIndex: 100 }
  const side = Math.sign(offset)
  const shift = side * (0.62 + (Math.abs(offset) - 1) * 0.3)
  return {
    transform: `translateX(calc(-50% + ${shift} * var(--cover))) translateZ(calc(var(--cover) * -0.6)) rotateY(${-side * 68}deg)`,
    zIndex: 100 - Math.abs(offset),
  }
}

const visible = computed(() =>
  albums.value
    .map((album, index) => ({ album, index }))
    .filter(({ index }) => Math.abs(index - selected.value) <= VISIBLE_SIDE),
)

function open() {
  if (current.value) nav.push({ name: 'album', albumId: current.value.id })
}

// Warm the track list of the centered album so opening it is instant.
watch(current, (album) => album && void library.loadTracks(album.id), { immediate: true })

// Horizontal swipe browses albums; a tap without movement selects or opens a cover.
let swipe: { x: number; index: number; moved: boolean } | null = null

function onPointerDown(event: PointerEvent) {
  swipe = { x: event.clientX, index: selected.value, moved: false }
}

function onPointerMove(event: PointerEvent) {
  if (!swipe) return
  const dx = event.clientX - swipe.x
  if (Math.abs(dx) > 6) swipe.moved = true
  selected.value = clamp(swipe.index - Math.round(dx / SWIPE_STEP_PX))
}

function onPointerUp() {
  setTimeout(() => (swipe = null))
}

function onCoverClick(index: number) {
  if (swipe?.moved) return
  if (index === selected.value) open()
  else selected.value = index
}

defineExpose({
  scroll: (delta: number) => (selected.value = clamp(selected.value + delta)),
  select: open,
})
</script>

<template>
  <div
    class="flow"
    data-own-swipe
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="swipe = null"
  >
    <p v-if="!albums.length" class="flow__empty">
      {{ isLoading ? $t('ipod.loading') : $t('ipod.noAlbums') }}
    </p>

    <div class="flow__stage">
      <button
        v-for="{ album, index } in visible"
        :key="album.id"
        type="button"
        class="flow__cover"
        :style="coverStyle(index)"
        :aria-label="album.name"
        @click="onCoverClick(index)"
      >
        <img v-if="album.coverUrl" :src="album.coverUrl" alt="" draggable="false" />
        <span v-else class="flow__placeholder">♪</span>
      </button>
    </div>

    <div v-if="current" class="flow__caption">
      <p class="flow__title">{{ current.name }}</p>
      <p class="flow__meta">
        {{ $t('ipod.tracks', current.trackCount) }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.flow {
  --cover: 56cqh;
  position: relative;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #000 0%, #0b0b0d 60%, #1b1c20 100%);
  touch-action: pan-y;
  user-select: none;
}

.flow__stage {
  position: absolute;
  inset: 0;
  perspective: calc(var(--cover) * 2.2);
}

.flow__cover {
  position: absolute;
  top: 8cqh;
  left: 50%;
  width: var(--cover);
  height: var(--cover);
  padding: 0;
  border: none;
  background: #222;
  transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.3, 1);
  -webkit-box-reflect: below 1px linear-gradient(transparent 60%, rgba(255, 255, 255, 0.28));
  cursor: pointer;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
}

.flow__placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #4b4f58, #1d1f24);
  color: #c9ccd2;
  font-size: calc(var(--cover) * 0.3);
}

.flow__caption {
  position: absolute;
  right: 0;
  bottom: 4cqh;
  left: 0;
  padding: 0 8px;
  color: #fff;
  font-family: inherit;
  text-align: center;
  pointer-events: none;
}

.flow__title,
.flow__meta {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.flow__title {
  font-weight: 700;
  font-size: max(11px, 6.5cqh);
}

.flow__meta {
  color: #a9adb5;
  font-size: max(10px, 5.2cqh);
}

.flow__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #a9adb5;
  font-size: 13px;
}
</style>
