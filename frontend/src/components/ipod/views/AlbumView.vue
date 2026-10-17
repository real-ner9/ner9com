<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import IpodList from '@/components/ipod/IpodList.vue'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR } from '@/types/ipod'
import { formatTime } from '@/utils/format'

/**
 * An opened album: the cover slides from the Cover Flow center to the left while the track list
 * unfolds on the right. The reverse animation runs in beforeLeave, before the screen pops it.
 */
const props = defineProps<{ albumId: string }>()

const OPEN_MS = 450

const nav = inject(IPOD_NAVIGATOR)!
const library = useLibraryStore()
const player = usePlayerStore()
const { currentTrack } = storeToRefs(player)

const album = computed(() => library.albumById(props.albumId))
const tracks = computed(() => library.tracksByAlbum[props.albumId] ?? [])
const artist = computed(() => tracks.value.find((track) => track.artist)?.artist ?? null)

const isOpen = ref(false)
const selected = ref(0)

const items = computed(() =>
  tracks.value.map((track, index) => ({
    id: track.id,
    label: `${index + 1}. ${track.title}`,
    trailing: formatTime(track.duration),
    playing: track.id === currentTrack.value?.id,
  })),
)

onMounted(async () => {
  // Two frames so the closed state is painted before transitioning to open.
  requestAnimationFrame(() => requestAnimationFrame(() => (isOpen.value = true)))
  const loaded = await library.loadTracks(props.albumId)
  const playing = loaded.findIndex((track) => track.id === currentTrack.value?.id)
  if (playing >= 0) selected.value = playing
})

function play(index: number) {
  if (!tracks.value.length) return
  selected.value = index
  player.playTracks(tracks.value, index)
  nav.push({ name: 'nowPlaying' })
}

defineExpose({
  scroll: (delta: number) => {
    selected.value = Math.min(
      Math.max(selected.value + delta, 0),
      Math.max(items.value.length - 1, 0),
    )
  },
  select: () => play(selected.value),
  beforeLeave: () => {
    isOpen.value = false
    return new Promise<void>((resolve) => setTimeout(resolve, OPEN_MS))
  },
})
</script>

<template>
  <div class="album" :class="{ 'album--open': isOpen }">
    <div class="album__cover">
      <img v-if="album?.coverUrl" :src="album.coverUrl" alt="" />
      <span v-else class="album__placeholder">♪</span>
    </div>

    <div class="album__caption">
      <p class="album__name">{{ album?.name }}</p>
      <p v-if="artist" class="album__artist">{{ artist }}</p>
    </div>

    <div class="album__tracks">
      <IpodList v-if="items.length" :items="items" :selected="selected" @activate="play" />
      <p v-else class="album__loading">{{ $t('ipod.loading') }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.album {
  --cover: 56cqh;
  --ease: cubic-bezier(0.25, 0.8, 0.3, 1);
  position: relative;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #000 0%, #0b0b0d 60%, #1b1c20 100%);
  perspective: 120cqh;
}

// Closed state matches the centered Cover Flow cover, so the hand-off is seamless.
.album__cover {
  position: absolute;
  top: 8cqh;
  left: 50%;
  width: var(--cover);
  height: var(--cover);
  transform: translateX(-50%);
  transition:
    left 0.45s var(--ease),
    transform 0.45s var(--ease),
    width 0.45s var(--ease),
    height 0.45s var(--ease);
  -webkit-box-reflect: below 1px linear-gradient(transparent 60%, rgba(255, 255, 255, 0.28));

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.album__placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #4b4f58, #1d1f24);
  color: #c9ccd2;
  font-size: calc(var(--cover) * 0.3);
}

.album--open .album__cover {
  left: 4%;
  width: 42cqw;
  height: 42cqw;
  max-height: 64cqh;
  max-width: 64cqh;
  transform: translateX(0) rotateY(8deg);
}

.album__caption {
  position: absolute;
  bottom: 4cqh;
  left: 4%;
  width: 42%;
  color: #fff;
  opacity: 0;
  transition: opacity 0.3s 0.2s;

  p {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.album--open .album__caption {
  opacity: 1;
}

.album__name {
  font-weight: 700;
  font-size: max(10px, 5.4cqh);
}

.album__artist {
  color: #a9adb5;
  font-size: max(10px, 4.8cqh);
}

// The track list unfolds from its left edge, like a page turning open.
.album__tracks {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 50%;
  overflow: hidden;
  background: #fff;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.5);
  transform-origin: left center;
  transform: rotateY(-95deg);
  opacity: 0;
  transition:
    transform 0.45s var(--ease) 0.08s,
    opacity 0.3s 0.08s;
}

.album--open .album__tracks {
  transform: rotateY(0);
  opacity: 1;
}

.album__loading {
  padding: 8px;
  color: #6b6f78;
  font-size: 12px;
}
</style>
