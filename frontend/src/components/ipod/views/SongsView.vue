<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import IpodList from '@/components/ipod/IpodList.vue'
import { useListNav } from '@/components/ipod/useListNav'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR } from '@/types/ipod'
import type { MusicTrack } from '@/types/music'

// Every song A–Z. Choosing one plays the list from there, like the iPod's Songs menu.
const nav = inject(IPOD_NAVIGATOR)!
const library = useLibraryStore()
const player = usePlayerStore()
const { currentTrack } = storeToRefs(player)

const songs = ref<MusicTrack[]>([])
const isLoading = ref(true)

const items = computed(() =>
  songs.value.map((track) => ({
    id: track.id,
    label: track.title,
    sublabel: track.artist,
    playing: track.id === currentTrack.value?.id,
  })),
)

const { selected, choose, handle } = useListNav(
  () => songs.value.length,
  (index) => {
    if (!songs.value.length) return
    player.playTracks(songs.value, index)
    nav.push({ name: 'nowPlaying' })
  },
)

onMounted(async () => {
  const all = await library.loadAllTracks()
  songs.value = [...all].sort((a, b) => a.title.localeCompare(b.title))
  isLoading.value = false
  const playing = songs.value.findIndex((track) => track.id === currentTrack.value?.id)
  if (playing >= 0) selected.value = playing
})

defineExpose(handle)
</script>

<template>
  <p v-if="isLoading" class="empty">{{ $t('ipod.loading') }}</p>
  <IpodList v-else :items="items" :selected="selected" @activate="choose" />
</template>

<style scoped>
.empty {
  height: 100%;
  padding: 8cqh 5cqw;
  background: #fff;
  color: #4b4f58;
  font-size: max(11px, 6cqh);
}
</style>
