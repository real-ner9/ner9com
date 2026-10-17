<script setup lang="ts">
import { t } from '@/i18n'
import { computed, inject } from 'vue'
import IpodList from '@/components/ipod/IpodList.vue'
import { useListNav } from '@/components/ipod/useListNav'
import { IPOD_NAVIGATOR, type IpodListItem, type IpodView } from '@/types/ipod'

// Music menu of the iPod classic, minus what the site has no data for (playlists, genres…).
const nav = inject(IPOD_NAVIGATOR)!

const items = computed<(IpodListItem & { view: IpodView })[]>(() => [
  { id: 'coverflow', label: 'Cover Flow', chevron: true, view: { name: 'coverflow' } },
  { id: 'artists', label: t('ipod.artists'), chevron: true, view: { name: 'artists' } },
  { id: 'albums', label: t('ipod.albums'), chevron: true, view: { name: 'albums' } },
  { id: 'songs', label: t('ipod.songs'), chevron: true, view: { name: 'songs' } },
])

const { selected, choose, handle } = useListNav(
  () => items.value.length,
  (index) => nav.push(items.value[index].view),
)

defineExpose(handle)
</script>

<template>
  <IpodList :items="items" :selected="selected" @activate="choose" />
</template>
