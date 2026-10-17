<script setup lang="ts">
import { t } from '@/i18n'
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import IpodList from '@/components/ipod/IpodList.vue'
import { useListNav } from '@/components/ipod/useListNav'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR, type IpodListItem, type IpodView } from '@/types/ipod'

// Main menu: list on the left, artwork slideshow on the right (iPod classic 6th gen layout).
const nav = inject(IPOD_NAVIGATOR)!
const player = usePlayerStore()
const { currentTrack } = storeToRefs(player)
const library = useLibraryStore()
const { albums } = storeToRefs(library)

type MenuItem = IpodListItem & { view?: IpodView; action?: () => void }

// The iPod classic main menu, without Videos, Photos, Podcasts, Extras and Settings; Fruity Dance
// takes the place of Extras.
const items = computed<MenuItem[]>(() => [
  { id: 'music', label: t('ipod.music'), chevron: true, view: { name: 'music' } },
  { id: 'shuffle', label: t('ipod.shuffleSongs'), action: shuffleSongs },
  { id: 'dance', label: 'Fruity Dance', chevron: true, view: { name: 'dance' } },
  ...(currentTrack.value
    ? [{ id: 'now', label: t('ipod.nowPlaying'), chevron: true, view: { name: 'nowPlaying' } as const }]
    : []),
])

/** Every song in random order, with shuffle left on (as on the iPod). */
async function shuffleSongs() {
  const all = await library.loadAllTracks()
  if (!all.length) return
  player.setShuffle(true)
  player.playTracks(all, Math.floor(Math.random() * all.length))
  nav.push({ name: 'nowPlaying' })
}

const { selected, choose, handle } = useListNav(
  () => items.value.length,
  (index) => {
    const item = items.value[index]
    if (item?.action) void item.action()
    else if (item?.view) nav.push(item.view)
  },
)

// Artwork pane: the playing cover, otherwise a slow slideshow of album covers.
const covers = computed(
  () => albums.value.map((album) => album.coverUrl).filter(Boolean) as string[],
)
const slide = ref(0)
const artwork = computed(
  () => currentTrack.value?.coverUrl ?? covers.value[slide.value % (covers.value.length || 1)],
)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => (timer = setInterval(() => slide.value++, 5000)))
onBeforeUnmount(() => clearInterval(timer))

defineExpose(handle)
</script>

<template>
  <div class="menu">
    <IpodList class="menu__list" :items="items" :selected="selected" @activate="choose" />
    <div class="menu__art">
      <Transition name="art">
        <img v-if="artwork" :key="artwork" class="menu__image" :src="artwork" alt="" />
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
.menu {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100%;
}

.menu__list {
  box-shadow: 1px 0 3px rgba(0, 0, 0, 0.25);
  z-index: 1;
}

.menu__art {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #2a2d33, #0e0f12);
}

.menu__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: ken-burns 10s ease-in-out infinite alternate;
}

@keyframes ken-burns {
  from {
    transform: scale(1.05) translate(0, 0);
  }

  to {
    transform: scale(1.25) translate(-6%, -4%);
  }
}

.art-enter-active,
.art-leave-active {
  transition: opacity 0.8s;
}

.art-enter-from,
.art-leave-to {
  opacity: 0;
}
</style>
