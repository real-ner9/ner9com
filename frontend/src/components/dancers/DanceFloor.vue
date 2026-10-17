<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import SpriteDancer from '@/components/dancers/SpriteDancer.vue'
import { DANCE_ROWS, FL_CHAN, HELD_ROW, IDLE_ROW } from '@/components/dancers/sprites'
import { useDancersStore } from '@/stores/dancers'
import { usePlayerStore } from '@/stores/player'
import { BeatClock, bassEnergy } from '@/utils/beatClock'
import { capture } from '@/utils/pointer'

/**
 * Two FL Chans (FL Studio's Fruity Dance) dancing to the player.
 *
 * Wide desktops: big dancers standing in the empty side margins. Phones and narrow windows: small
 * dancers that can be dragged anywhere. The disco-ball button in the header turns them on and off.
 */
const dancersStore = useDancersStore()
const { isEnabled } = storeToRefs(dancersStore)
const player = usePlayerStore()
const { isPlaying, currentTrack } = storeToRefs(player)

const FRAMES = FL_CHAN.columns
const FRAMES_PER_BEAT = 4 // one 8-frame loop every 2 beats
const BEATS_PER_MOVE = 8 // switch moves every 2 bars
const CONTENT_WIDTH = 1100 // keep in sync with --content-width
const MIN_MARGIN_DANCER = 150 // side margin needed for the "big dancers on the borders" layout
const SMALL_WIDTH = 84

// --- Layout ---------------------------------------------------------------------------------

const viewport = reactive({ width: window.innerWidth, height: window.innerHeight })
const onResize = () => {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
  dragged.value = [null, null]
}

const margin = computed(() => (viewport.width - CONTENT_WIDTH) / 2)
const onBorders = computed(() => viewport.width >= 768 && margin.value - 32 >= MIN_MARGIN_DANCER)
const width = computed(() => (onBorders.value ? Math.min(margin.value - 32, 300) : SMALL_WIDTH))
const height = computed(() => (width.value * FL_CHAN.cellHeight) / FL_CHAN.cellWidth)

/** Positions set by dragging; null means "use the default spot". */
const dragged = ref<({ x: number; y: number } | null)[]>([null, null])

function defaultPosition(index: number) {
  if (onBorders.value) {
    const x =
      index === 0
        ? (margin.value - width.value) / 2
        : viewport.width - (margin.value + width.value) / 2
    return { x, y: (viewport.height - height.value) / 2 }
  }
  // Phones: one in each bottom corner, standing on the player dock.
  const peek =
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ipod-peek')) || 120
  const x = index === 0 ? 8 : viewport.width - width.value - 8
  return { x, y: viewport.height - peek - height.value + 6 }
}

const positions = computed(() => [0, 1].map((i) => dragged.value[i] ?? defaultPosition(i)))

// --- Dragging -------------------------------------------------------------------------------

const holding = ref<number | null>(null)
let grab: { index: number; pointerId: number; dx: number; dy: number } | null = null

function onPointerDown(index: number, event: PointerEvent) {
  const { x, y } = positions.value[index]
  grab = { index, pointerId: event.pointerId, dx: event.clientX - x, dy: event.clientY - y }
  holding.value = index
  capture(event.currentTarget as Element, event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!grab || event.pointerId !== grab.pointerId) return
  const x = Math.min(Math.max(event.clientX - grab.dx, 0), viewport.width - width.value)
  const y = Math.min(Math.max(event.clientY - grab.dy, 0), viewport.height - height.value)
  const next = [...dragged.value]
  next[grab.index] = { x, y }
  dragged.value = next
}

function onPointerUp(event: PointerEvent) {
  if (!grab || event.pointerId !== grab.pointerId) return
  grab = null
  holding.value = null
}

// --- Dancing --------------------------------------------------------------------------------

const clock = new BeatClock()
let frequencies: Uint8Array<ArrayBuffer> | null = null
const pose = ref([
  { row: IDLE_ROW, frame: 0 },
  { row: IDLE_ROW, frame: 0 },
])

/** Deterministic "random" move per 2-bar segment, different for each dancer. */
function moveFor(segment: number, dancer: number) {
  const hash = Math.abs(Math.sin(segment * 12.9898 + dancer * 78.233) * 43758.5453) % 1
  return DANCE_ROWS[Math.floor(hash * DANCE_ROWS.length)]
}

let rafId = 0
let lastTime = 0
let idleTime = 0

function tick(now: number) {
  rafId = requestAnimationFrame(tick)
  const dt = Math.min((now - lastTime) / 1000, 0.1)
  lastTime = now
  idleTime += dt

  if (isPlaying.value) {
    const analyser = player.getAnalyserIfReady()
    let energy: number | null = null
    if (analyser) {
      frequencies ??= new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(frequencies)
      energy = bassEnergy(frequencies)
    }
    clock.update(dt, energy)
  }

  const next = [0, 1].map((dancer) => {
    if (holding.value === dancer)
      return { row: HELD_ROW, frame: Math.floor(idleTime * 10) % FRAMES }
    if (!isPlaying.value) return { row: IDLE_ROW, frame: Math.floor(idleTime * 6) % FRAMES }
    const segment = Math.floor(clock.position / BEATS_PER_MOVE)
    return {
      row: moveFor(segment, dancer),
      frame: Math.floor(clock.position * FRAMES_PER_BEAT) % FRAMES,
    }
  })
  // Only touch reactive state when a frame actually changes (a few times per second).
  if (next.some((p, i) => p.row !== pose.value[i].row || p.frame !== pose.value[i].frame)) {
    pose.value = next
  }
}

function start() {
  if (rafId) return
  lastTime = performance.now()
  rafId = requestAnimationFrame(tick)
}

function stop() {
  cancelAnimationFrame(rafId)
  rafId = 0
}

// The analyser can only be created inside a user gesture (iOS/Safari keep a context created
// elsewhere suspended, which would mute the music), so hook the next tap or key press.
function connectAnalyser() {
  if (isEnabled.value) player.getAnalyser()
}

watch(currentTrack, () => clock.reset())

watch(
  isEnabled,
  (enabled) => {
    if (enabled) start()
    else stop()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', onResize)
  document.addEventListener('pointerdown', connectAnalyser, { capture: true })
  document.addEventListener('keydown', connectAnalyser, { capture: true })
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', onResize)
  document.removeEventListener('pointerdown', connectAnalyser, { capture: true })
  document.removeEventListener('keydown', connectAnalyser, { capture: true })
})
</script>

<template>
  <template v-if="isEnabled">
    <div
      v-for="(position, index) in positions"
      :key="index"
      class="dance-floor__dancer"
      :class="{ 'dance-floor__dancer--held': holding === index }"
      :style="{ transform: `translate(${position.x}px, ${position.y}px)` }"
      @pointerdown="onPointerDown(index, $event)"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <SpriteDancer
        :sprite="FL_CHAN"
        :row="pose[index].row"
        :frame="pose[index].frame"
        :width="width"
        :hue="index === 1 ? 140 : 0"
        :mirrored="index === 1"
      />
    </div>
  </template>
</template>

<style scoped lang="scss">
.dance-floor__dancer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 30;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  will-change: transform;

  &--held {
    cursor: grabbing;
  }
}
</style>
