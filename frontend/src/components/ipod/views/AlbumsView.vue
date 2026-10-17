<script setup lang="ts">
import { t } from '@/i18n'
import { computed, inject, ref } from 'vue'
import { storeToRefs } from 'pinia'
import IpodList from '@/components/ipod/IpodList.vue'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR } from '@/types/ipod'

const nav = inject(IPOD_NAVIGATOR)!
const library = useLibraryStore()
const { albums } = storeToRefs(library)
const { album: playingAlbum } = storeToRefs(usePlayerStore())

const items = computed(() =>
  albums.value.map((album) => ({
    id: album.id,
    label: album.name,
    sublabel: t('ipod.tracks', album.trackCount),
    image: album.coverUrl,
    playing: album.id === playingAlbum.value?.id,
  })),
)

const selected = ref(
  Math.max(
    0,
    albums.value.findIndex((a) => a.id === playingAlbum.value?.id),
  ),
)

function activate(index: number) {
  selected.value = index
  const album = albums.value[index]
  if (album) nav.push({ name: 'album', albumId: album.id })
}

defineExpose({
  scroll: (delta: number) => {
    selected.value = Math.min(Math.max(selected.value + delta, 0), items.value.length - 1)
  },
  select: () => activate(selected.value),
})
</script>

<template>
  <IpodList :items="items" :selected="selected" thumbs @activate="activate" />
</template>
