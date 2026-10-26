<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { DANCE_ROWS } from '@/components/dancers/sprites'
import { MAX_DANCERS, useDancersStore, type DanceMove } from '@/stores/dancers'

/**
 * One dancer's own settings, opened by right-clicking her (a long press on phones), like the
 * right-click menu of FL Studio's plugins: her move, another dancer, or sending her away.
 * The same settings as iPod → Fruity Dance, just closer at hand.
 */
const props = defineProps<{ dancer: number; x: number; y: number }>()
// Sending her away is left to the dance floor, which also shifts the dragged spots.
const emit = defineEmits<{ close: []; remove: [] }>()

const dancers = useDancersStore()
const { moves, count } = storeToRefs(dancers)
const current = computed(() => moves.value[props.dancer] ?? 'auto')
const MOVES: DanceMove[] = ['auto', ...DANCE_ROWS]

// Opens at the pointer, shifted back inside the window when it would overflow.
const menu = ref<HTMLElement | null>(null)
const spot = ref({ left: props.x, top: props.y })
onMounted(async () => {
  await nextTick()
  if (!menu.value) return
  const { width, height } = menu.value.getBoundingClientRect()
  spot.value = {
    left: Math.max(8, Math.min(props.x, document.documentElement.clientWidth - width - 8)),
    top: Math.max(8, Math.min(props.y, window.innerHeight - height - 8)),
  }
})

function pick(move: DanceMove) {
  dancers.setMove(props.dancer, move)
  emit('close')
}

function add() {
  dancers.addDancer()
  emit('close')
}

function remove() {
  emit('remove')
  emit('close')
}

// Any press outside, Esc, scrolling or resizing closes it.
const onOutside = (event: PointerEvent) => {
  if (!menu.value?.contains(event.target as Node)) emit('close')
}
const onKey = (event: KeyboardEvent) => event.key === 'Escape' && emit('close')
const close = () => emit('close')

onMounted(() => {
  document.addEventListener('pointerdown', onOutside, { capture: true })
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', close)
  window.addEventListener('scroll', close, { passive: true })
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside, { capture: true })
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', close)
  window.removeEventListener('scroll', close)
})
</script>

<template>
  <div
    ref="menu"
    class="dancer-menu"
    role="menu"
    :style="{ left: `${spot.left}px`, top: `${spot.top}px` }"
    @contextmenu.prevent
  >
    <p class="dancer-menu__title">{{ $t('ipod.dancer', { n: dancer + 1 }) }}</p>
    <button
      v-for="move in MOVES"
      :key="move"
      type="button"
      role="menuitemradio"
      :aria-checked="move === current"
      class="dancer-menu__item"
      @click="pick(move)"
    >
      <span class="dancer-menu__check">{{ move === current ? '✓' : '' }}</span>
      {{ move === 'auto' ? $t('ipod.auto') : move }}
    </button>
    <hr class="dancer-menu__line" />
    <button
      v-if="count < MAX_DANCERS"
      type="button"
      role="menuitem"
      class="dancer-menu__item"
      @click="add"
    >
      <span class="dancer-menu__check">+</span>{{ $t('dance.add') }}
    </button>
    <button type="button" role="menuitem" class="dancer-menu__item" @click="remove">
      <span class="dancer-menu__check">×</span>{{ $t('dance.remove') }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.dancer-menu {
  position: fixed;
  z-index: 60;
  display: flex;
  flex-direction: column;
  min-width: 190px;
  padding: 4px;
  border: 1px solid var(--card-border, var(--color-border));
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 14px;
  user-select: none;
  -webkit-user-select: none;
}

.dancer-menu__title {
  padding: 6px 10px 4px;
  color: var(--color-text-muted);
  font-family: var(--font-label);
  font-size: 12px;
}

.dancer-menu__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background: var(--color-accent);
    color: var(--color-on-accent);
    outline: none;
  }
}

.dancer-menu__check {
  width: 14px;
  text-align: center;
}

.dancer-menu__line {
  margin: 4px 6px;
  border: none;
  border-top: 1px solid var(--color-border);
}
</style>
