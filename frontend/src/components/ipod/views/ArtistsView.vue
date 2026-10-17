<script setup lang="ts">
import { t } from '@/i18n'
import { computed, inject, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import IpodList from '@/components/ipod/IpodList.vue'
import { useListNav } from '@/components/ipod/useListNav'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR } from '@/types/ipod'

// Artists, each by the albums credited to them; choosing one lists those albums.
const nav = inject(IPOD_NAVIGATOR)!
const library = useLibraryStore()
const { albums } = storeToRefs(library)
const { currentTrack } = storeToRefs(usePlayerStore())

// Album artists need the tracks' tags.
onMounted(() => void library.loadAllTracks())

const artists = computed(() => {
  const byArtist = new Map<string, number>()
  for (const album of albums.value) {
    const artist = library.albumArtist(album.id)
    if (artist) byArtist.set(artist, (byArtist.get(artist) ?? 0) + 1)
  }
  return [...byArtist].sort(([a], [b]) => a.localeCompare(b))
})

const playingArtist = computed(() =>
  currentTrack.value ? library.albumArtist(currentTrack.value.albumId) : null,
)

const items = computed(() =>
  artists.value.map(([artist, count]) => ({
    id: artist,
    label: artist,
    sublabel: t('ipod.albumCount', count),
    playing: artist === playingArtist.value,
    chevron: true,
  })),
)

const { selected, choose, handle } = useListNav(
  () => items.value.length,
  (index) => nav.push({ name: 'albums', artist: artists.value[index][0] }),
)

defineExpose(handle)
</script>

<template>
  <p v-if="!items.length" class="empty">{{ $t('ipod.loading') }}</p>
  <IpodList v-else :items="items" :selected="selected" @activate="choose" />
</template>

<style scoped>
.empty {
  padding: 8cqh 5cqw;
  background: #fff;
  color: #4b4f58;
  font-size: max(11px, 6cqh);
  height: 100%;
}
</style>
