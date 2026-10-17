<script setup lang="ts">
import { t } from '@/i18n'
import { computed, inject } from 'vue'
import { storeToRefs } from 'pinia'
import IpodList from '@/components/ipod/IpodList.vue'
import { useListNav } from '@/components/ipod/useListNav'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR } from '@/types/ipod'

/** All albums, or only those credited to `artist` (opened from Artists). */
const props = defineProps<{ artist?: string }>()

const nav = inject(IPOD_NAVIGATOR)!
const library = useLibraryStore()
const { album: playingAlbum } = storeToRefs(usePlayerStore())

const albums = computed(() =>
  props.artist
    ? library.albums.filter((album) => library.albumArtist(album.id) === props.artist)
    : library.albums,
)

const items = computed(() =>
  albums.value.map((album) => ({
    id: album.id,
    label: album.name,
    sublabel: t('ipod.tracks', album.trackCount),
    image: album.coverUrl,
    playing: album.id === playingAlbum.value?.id,
  })),
)

const { selected, choose, handle } = useListNav(
  () => albums.value.length,
  (index) => {
    const album = albums.value[index]
    if (album) nav.push({ name: 'album', albumId: album.id })
  },
  Math.max(
    0,
    albums.value.findIndex((a) => a.id === playingAlbum.value?.id),
  ),
)

defineExpose(handle)
</script>

<template>
  <IpodList :items="items" :selected="selected" thumbs @activate="choose" />
</template>
