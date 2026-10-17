<script setup lang="ts">
import { t } from '@/i18n'
import { computed, inject } from 'vue'
import { storeToRefs } from 'pinia'
import IpodList from '@/components/ipod/IpodList.vue'
import { useListNav } from '@/components/ipod/useListNav'
import { useDancersStore } from '@/stores/dancers'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR, type IpodListItem } from '@/types/ipod'

// Fruity Dance settings as iPod setting rows: the value on the right, the center button changes it.
const nav = inject(IPOD_NAVIGATOR)!
const dancers = useDancersStore()
const player = usePlayerStore()
const { isEnabled, count, moves } = storeToRefs(dancers)

const items = computed<(IpodListItem & { action: () => void })[]>(() => [
  {
    id: 'enabled',
    label: 'Fruity Dance',
    trailing: isEnabled.value ? t('ipod.on') : t('ipod.off'),
    action: () => {
      dancers.toggle()
      // Wheel/tap presses are user gestures, so the analyser may start here.
      if (isEnabled.value) player.getAnalyser()
    },
  },
  {
    id: 'count',
    label: t('ipod.dancers'),
    trailing: String(count.value),
    action: dancers.cycleCount,
  },
  // One row per dancer on screen, each with its own move.
  ...moves.value.slice(0, count.value).map((move, dancer) => ({
    id: `dancer-${dancer}`,
    label: t('ipod.dancer', { n: dancer + 1 }),
    trailing: move === 'auto' ? t('ipod.auto') : move,
    chevron: true,
    action: () => nav.push({ name: 'danceMoves', dancer }),
  })),
])

const { selected, choose, handle } = useListNav(
  () => items.value.length,
  (index) => items.value[index].action(),
)

defineExpose(handle)
</script>

<template>
  <IpodList :items="items" :selected="selected" @activate="choose" />
</template>
