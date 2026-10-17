<script setup lang="ts">
import { t } from '@/i18n'
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import IpodList from '@/components/ipod/IpodList.vue'
import { useDancersStore } from '@/stores/dancers'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR, type IpodListItem, type IpodView } from '@/types/ipod'

// Main menu: list on the left, artwork slideshow on the right (iPod classic 6th gen layout).
const nav = inject(IPOD_NAVIGATOR)!
const player = usePlayerStore()
const { currentTrack } = storeToRefs(player)
const dancers = useDancersStore()
const { isEnabled: dancing } = storeToRefs(dancers)
const { albums } = storeToRefs(useLibraryStore())

type MenuItem = IpodListItem & { view?: IpodView['name']; action?: () => void }

const items = computed<MenuItem[]>(() => [
  { id: 'coverflow', label: 'Cover Flow', chevron: true, view: 'coverflow' },
  { id: 'albums', label: t('ipod.albums'), chevron: true, view: 'albums' },
  ...(currentTrack.value
    ? [{ id: 'now', label: t('ipod.nowPlaying'), chevron: true, view: 'nowPlaying' as const }]
    : []),
  // A setting row like on the real iPod: the value sits on the right.
  {
    id: 'dance',
    label: 'Fruity Dance',
    trailing: dancing.value ? t('ipod.on') : t('ipod.off'),
    action: toggleDance,
  },
])

function toggleDance() {
  dancers.toggle()
  // Wheel/tap presses are user gestures, so the analyser may start here.
  if (dancing.value) player.getAnalyser()
}
const selected = ref(0)

function activate(index: number) {
  selected.value = index
  const item = items.value[index]
  if (item?.action) item.action()
  else if (item?.view === 'coverflow' || item?.view === 'albums' || item?.view === 'nowPlaying') {
    nav.push({ name: item.view })
  }
}

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

defineExpose({
  scroll: (delta: number) => {
    selected.value = Math.min(Math.max(selected.value + delta, 0), items.value.length - 1)
  },
  select: () => activate(selected.value),
})
</script>

<template>
  <div class="menu">
    <IpodList class="menu__list" :items="items" :selected="selected" @activate="activate" />
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
