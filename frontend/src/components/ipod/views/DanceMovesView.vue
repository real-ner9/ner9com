<script setup lang="ts">
import { t } from '@/i18n'
import { computed, inject } from 'vue'
import { storeToRefs } from 'pinia'
import IpodList from '@/components/ipod/IpodList.vue'
import { useListNav } from '@/components/ipod/useListNav'
import { DANCE_ROWS } from '@/components/dancers/sprites'
import { useDancersStore, type DanceMove } from '@/stores/dancers'
import { IPOD_NAVIGATOR } from '@/types/ipod'

// One dancer's move: the sprite sheet's rows, like the notes that pick a move in Fruity Dance.
// Auto changes it every two bars.
const props = defineProps<{ dancer: number }>()

const nav = inject(IPOD_NAVIGATOR)!
const dancers = useDancersStore()
const { moves: chosen } = storeToRefs(dancers)
const current = computed(() => chosen.value[props.dancer] ?? 'auto')

const moves: DanceMove[] = ['auto', ...DANCE_ROWS]

const items = computed(() =>
  moves.map((value) => ({
    id: value,
    label: value === 'auto' ? t('ipod.auto') : value,
    trailing: value === current.value ? '✓' : null,
  })),
)

const { selected, choose, handle } = useListNav(
  () => moves.length,
  (index) => {
    dancers.setMove(props.dancer, moves[index])
    void nav.back()
  },
  Math.max(moves.indexOf(current.value), 0),
)

defineExpose(handle)
</script>

<template>
  <IpodList :items="items" :selected="selected" @activate="choose" />
</template>
