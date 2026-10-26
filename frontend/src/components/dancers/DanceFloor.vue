<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import DancerMenu from '@/components/dancers/DancerMenu.vue'
import SpriteDancer from '@/components/dancers/SpriteDancer.vue'
import { DANCE_ROWS, FL_CHAN, HELD_ROW, IDLE_ROW } from '@/components/dancers/sprites'
import { MAX_DANCERS, useDancersStore } from '@/stores/dancers'
import { useIpodStore } from '@/stores/ipod'
import { usePlayerStore } from '@/stores/player'
import { BeatClock, bassEnergy } from '@/utils/beatClock'
import { capture } from '@/utils/pointer'

/**
 * FL Chans (FL Studio's Fruity Dance) dancing to the player: 1–4 of them, alternating left and
 * right, each but the first hue-shifted, every other one mirrored.
 *
 * Wide desktops: big dancers standing in the empty side margins. Phones and narrow windows: small
 * dancers that can be dragged anywhere. The disco-ball button in the header turns them on and off;
 * the iPod's Fruity Dance menu sets how many and which move, and so does each dancer's own menu
 * (right click, or a long press without moving on touch screens).
 */
const dancersStore = useDancersStore()
const { isEnabled, count, moves } = storeToRefs(dancersStore)
const HUES = [0, 140, 260, 50]
const player = usePlayerStore()
const ipod = useIpodStore()
const { isPlaying, currentTrack } = storeToRefs(player)

const FRAMES = FL_CHAN.columns
const FRAMES_PER_BEAT = 4 // one 8-frame loop every 2 beats
const BEATS_PER_MOVE = 8 // switch moves every 2 bars
const CONTENT_WIDTH = 1100 // keep in sync with --content-width
const MIN_MARGIN_DANCER = 150 // side margin needed for the "big dancers on the borders" layout
const SMALL_WIDTH = 84

// --- Layout ---------------------------------------------------------------------------------

const viewport = reactive({ width: window.innerWidth, height: window.innerHeight })
// Phones resize the viewport's height whenever the browser bars slide in or out while
// scrolling; dragged dancers stay where they were put (kept on screen). Only a width change
// (rotation, a resized window) means a new layout and sends them back to their spots.
const onResize = () => {
  const widthChanged = window.innerWidth !== viewport.width
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
  dragged.value = widthChanged
    ? Array(MAX_DANCERS).fill(null)
    : dragged.value.map((spot) =>
        spot && { x: spot.x, y: Math.min(spot.y, Math.max(viewport.height - height.value, 0)) },
      )
}

const margin = computed(() => (viewport.width - CONTENT_WIDTH) / 2)
const onBorders = computed(() => viewport.width >= 768 && margin.value - 32 >= MIN_MARGIN_DANCER)
/** Even dancers stand on the left, odd ones on the right; the left side gets the extra one. */
const perSide = computed(() => Math.ceil(count.value / 2))
const width = computed(() => {
  if (!onBorders.value) return SMALL_WIDTH
  // Stacked dancers share the margin's height.
  const fitHeight = (viewport.height - 80) / perSide.value - 12
  return Math.min(margin.value - 32, 300, (fitHeight * FL_CHAN.cellWidth) / FL_CHAN.cellHeight)
})
const height = computed(() => (width.value * FL_CHAN.cellHeight) / FL_CHAN.cellWidth)

/** Positions set by dragging; null means "use the default spot". */
const dragged = ref<({ x: number; y: number } | null)[]>(Array(MAX_DANCERS).fill(null))

function defaultPosition(index: number) {
  const right = index % 2 === 1
  const slot = Math.floor(index / 2)
  if (onBorders.value) {
    const x = right
      ? viewport.width - (margin.value + width.value) / 2
      : (margin.value - width.value) / 2
    const onThisSide = right ? Math.floor(count.value / 2) : perSide.value
    const column = onThisSide * height.value + (onThisSide - 1) * 12
    return { x, y: (viewport.height - column) / 2 + slot * (height.value + 12) }
  }
  // Phones: in the bottom corners, standing on the player dock (or the screen edge when the
  // player is hidden); extra dancers step inwards.
  const peek = ipod.isVisible
    ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ipod-peek')) || 120
    : 0
  const inset = 8 + slot * width.value * 0.7
  const x = right ? viewport.width - width.value - inset : inset
  return { x, y: viewport.height - peek - height.value + 6 }
}

const indices = computed(() => Array.from({ length: count.value }, (_, i) => i))
const positions = computed(() => indices.value.map((i) => dragged.value[i] ?? defaultPosition(i)))

// --- Dragging and the dancer's menu -------------------------------------------------------

const LONG_PRESS_MS = 500
/** A finger that moves further than this is dragging, not long-pressing. */
const PRESS_SLOP = 8

const holding = ref<number | null>(null)
/** The dancer being long-pressed, lit up until her menu opens. */
const pressing = ref<number | null>(null)
const menu = ref<{ dancer: number; x: number; y: number } | null>(null)
let grab: { index: number; pointerId: number; dx: number; dy: number } | null = null
let press: { timer: number; x: number; y: number } | null = null

function cancelPress() {
  if (press) clearTimeout(press.timer)
  press = null
  pressing.value = null
}

function openMenu(dancer: number, x: number, y: number) {
  cancelPress()
  grab = null
  holding.value = null
  menu.value = { dancer, x, y }
}

function onPointerDown(index: number, event: PointerEvent) {
  // The right button opens the menu (contextmenu) instead of dragging.
  if (event.button === 2) return
  const { x, y } = positions.value[index]
  grab = { index, pointerId: event.pointerId, dx: event.clientX - x, dy: event.clientY - y }
  holding.value = index
  capture(event.currentTarget as Element, event.pointerId)
  // Touch screens have no right click: holding still for a moment opens the menu.
  if (event.pointerType !== 'mouse') {
    cancelPress()
    const { clientX, clientY } = event
    press = {
      x: clientX,
      y: clientY,
      timer: window.setTimeout(() => {
        navigator.vibrate?.(12)
        openMenu(index, clientX, clientY)
      }, LONG_PRESS_MS),
    }
    pressing.value = index
  }
}

function onPointerMove(event: PointerEvent) {
  if (!grab || event.pointerId !== grab.pointerId) return
  if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > PRESS_SLOP) {
    cancelPress()
  }
  const x = Math.min(Math.max(event.clientX - grab.dx, 0), viewport.width - width.value)
  const y = Math.min(Math.max(event.clientY - grab.dy, 0), viewport.height - height.value)
  const next = [...dragged.value]
  next[grab.index] = { x, y }
  dragged.value = next
}

function onPointerUp(event: PointerEvent) {
  cancelPress()
  if (!grab || event.pointerId !== grab.pointerId) return
  grab = null
  holding.value = null
}

function onContextMenu(index: number, event: MouseEvent) {
  openMenu(index, event.clientX, event.clientY)
}

/** Sends a dancer away; the ones after her keep their dragged spots as they move up a slot. */
function removeDancer(dancer: number) {
  dragged.value = [...dragged.value.filter((_, i) => i !== dancer), null]
  dancersStore.removeDancer(dancer)
}

watch([isEnabled, count], () => (menu.value = null))

// --- Dancing --------------------------------------------------------------------------------

const clock = new BeatClock()
let frequencies: Uint8Array<ArrayBuffer> | null = null
const pose = ref(Array.from({ length: MAX_DANCERS }, () => ({ row: IDLE_ROW, frame: 0 })))

/** The dancer's chosen move, or a deterministic "random" one per 2-bar segment. */
function moveFor(segment: number, dancer: number) {
  const chosen = moves.value[dancer]
  if (chosen && chosen !== 'auto') return chosen
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

  const next = pose.value.map((_, dancer) => {
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
  cancelPress()
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
      :class="{
        'dance-floor__dancer--held': holding === index,
        'dance-floor__dancer--pressing': pressing === index,
      }"
      :style="{ transform: `translate(${position.x}px, ${position.y}px)` }"
      @pointerdown="onPointerDown(index, $event)"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent="onContextMenu(index, $event)"
    >
      <SpriteDancer
        :sprite="FL_CHAN"
        :row="pose[index].row"
        :frame="pose[index].frame"
        :width="width"
        :hue="HUES[index]"
        :mirrored="index % 2 === 1"
      />
    </div>
    <DancerMenu
      v-if="menu"
      :key="menu.dancer"
      :dancer="menu.dancer"
      :x="menu.x"
      :y="menu.y"
      @remove="removeDancer(menu.dancer)"
      @close="menu = null"
    />
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
  -webkit-touch-callout: none;
  will-change: transform;

  &--held {
    cursor: grabbing;
  }

  // A long press lights her up, so it's clear the menu is about to open.
  & > :deep(*) {
    transition: filter 0.15s;
  }

  &--pressing > :deep(*) {
    filter: drop-shadow(0 0 10px var(--color-accent));
    transition: filter 0.5s ease-in;
  }
}
</style>
