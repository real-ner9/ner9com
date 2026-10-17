<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import IpodClickWheel from '@/components/ipod/IpodClickWheel.vue'
import IpodScreen from '@/components/ipod/IpodScreen.vue'
import { useIpodStore } from '@/stores/ipod'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { capture } from '@/utils/pointer'
import { startIntroTrack } from './introTrack'

/**
 * The site's music player: an iPod classic in a bottom sheet (bottom-right corner on desktop).
 * Collapsed, only the top of the device peeks out with a mini player; drag it up or tap to open,
 * drag down, tap the backdrop or the close button to put it away.
 */
const ipod = useIpodStore()
const { isExpanded } = storeToRefs(ipod)
const player = usePlayerStore()
const library = useLibraryStore()

const sheetRef = ref<HTMLElement | null>(null)
const screenRef = ref<InstanceType<typeof IpodScreen> | null>(null)

// --- Sheet geometry -------------------------------------------------------------------------

/** translateY of the sheet when collapsed: everything below the mini player row is hidden. */
const collapsedOffset = ref(0)
/** Live offset while the user drags; null when the sheet rests in a state. */
const dragOffset = ref<number | null>(null)

const offset = computed(() => dragOffset.value ?? (isExpanded.value ? 0 : collapsedOffset.value))
/** 0 = collapsed, 1 = expanded; drives the backdrop. */
const openness = computed(() =>
  collapsedOffset.value ? 1 - offset.value / collapsedOffset.value : Number(isExpanded.value),
)

function measure() {
  const sheet = sheetRef.value
  const peekEnd = sheet?.querySelector<HTMLElement>('[data-peek-end]')
  if (!sheet || !peekEnd) return
  const style = getComputedStyle(sheet)
  const safeArea = parseFloat(style.paddingBottom) || 0
  // Distances inside the sheet are unaffected by its own translateY.
  const peek = peekEnd.getBoundingClientRect().top - sheet.getBoundingClientRect().top + 2
  collapsedOffset.value = Math.max(sheet.offsetHeight - safeArea - peek, 0)
  // Pages pad their bottom by this much so the peeking iPod never covers content.
  document.documentElement.style.setProperty('--ipod-peek', `${Math.round(peek + safeArea)}px`)
}

let resizeObserver: ResizeObserver | null = null
onMounted(async () => {
  await nextTick()
  measure()
  resizeObserver = new ResizeObserver(measure)
  if (sheetRef.value) resizeObserver.observe(sheetRef.value)
  window.addEventListener('keydown', onKeydown)
  // Also loads the album list, so opening the iPod is instant.
  void startIntroTrack()
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

// --- Dragging -------------------------------------------------------------------------------

let drag: { pointerId: number; y: number; start: number; time: number; moved: boolean } | null =
  null

function onPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement
  // The wheel, buttons and (when open) the screen have their own gestures.
  if (target.closest('[data-no-drag]')) return
  if (isExpanded.value && target.closest('.ipod__screen')) return
  drag = {
    pointerId: event.pointerId,
    y: event.clientY,
    start: offset.value,
    time: performance.now(),
    moved: false,
  }
}

function onPointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return
  const dy = event.clientY - drag.y
  if (!drag.moved) {
    if (Math.abs(dy) < 6) return
    drag.moved = true
    if (sheetRef.value) capture(sheetRef.value, event.pointerId)
  }
  dragOffset.value = Math.min(Math.max(drag.start + dy, 0), collapsedOffset.value)
}

function onPointerUp(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return
  const { moved, y, time } = drag
  drag = null
  if (!moved) {
    if (!isExpanded.value) ipod.expand()
    return
  }
  // A flick decides by direction; a slow drag by how far it got.
  const velocity = (event.clientY - y) / (performance.now() - time)
  const current = dragOffset.value ?? 0
  const expand =
    velocity < -0.35 ? true : velocity > 0.35 ? false : current < collapsedOffset.value / 2
  dragOffset.value = null
  if (expand) ipod.expand()
  else ipod.collapse()
}

function onPointerCancel() {
  drag = null
  dragOffset.value = null
}

// --- Behaviour ------------------------------------------------------------------------------

const isMobile = window.matchMedia('(max-width: 767px)')

watch(isExpanded, (expanded) => {
  if (expanded) void library.loadAlbums()
  // Lock page scrolling behind the open sheet on phones.
  document.body.style.overflow = expanded && isMobile.matches ? 'hidden' : ''
})

async function onMenu() {
  const wentBack = await screenRef.value?.back()
  if (!wentBack) ipod.collapse()
}

function onKeydown(event: KeyboardEvent) {
  if (!isExpanded.value) return
  const target = event.target
  if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]')) {
    return
  }
  const actions: Record<string, () => void> = {
    ArrowDown: () => screenRef.value?.scroll(1),
    ArrowRight: () => screenRef.value?.scroll(1),
    ArrowUp: () => screenRef.value?.scroll(-1),
    ArrowLeft: () => screenRef.value?.scroll(-1),
    Enter: () => screenRef.value?.select(),
    Backspace: () => void onMenu(),
    Escape: () => ipod.collapse(),
    ' ': () => player.toggle(),
  }
  const action = actions[event.key]
  if (!action) return
  event.preventDefault()
  action()
}
</script>

<template>
  <div
    v-if="openness > 0.01"
    class="ipod-backdrop"
    :style="{ opacity: openness * 0.55 }"
    @click="ipod.collapse"
  />

  <!-- Phones: a glass dock across the bottom that the collapsed iPod rises out of. -->
  <div class="ipod-dock" :style="{ opacity: 1 - openness }" aria-hidden="true" />

  <section
    ref="sheetRef"
    class="ipod-sheet"
    :class="{ 'ipod-sheet--dragging': dragOffset !== null, 'ipod-sheet--open': isExpanded }"
    :style="{ transform: `translateY(${offset}px)` }"
    :aria-label="$t('ipod.player')"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <div class="ipod-sheet__handle">
      <span class="ipod-sheet__grip" />
      <button
        v-if="isExpanded"
        type="button"
        class="ipod-sheet__close"
        data-no-drag
        :aria-label="$t('ipod.collapse')"
        @click="ipod.collapse"
      >
        ✕
      </button>
    </div>

    <div class="ipod">
      <div class="ipod__screen">
        <IpodScreen
          ref="screenRef"
          :compact="!isExpanded"
          :mini-opacity="1 - openness"
          @expand="ipod.expand"
        />
      </div>
      <!-- The collapsed sheet shows everything above this marker. -->
      <span class="ipod__peek-end" data-peek-end />

      <div class="ipod__wheel">
        <IpodClickWheel
          @scroll="screenRef?.scroll($event)"
          @select="screenRef?.select()"
          @menu="onMenu"
          @next="player.next"
          @previous="player.previous"
          @play-pause="player.toggle"
        />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.ipod-dock {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 45;
  // The iPod top pokes ~28px above the dock.
  height: max(calc(var(--ipod-peek, 120px) - 28px), 0px);
  border-top: 1px solid var(--color-border);
  background: var(--dock-bg);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.08);
  pointer-events: none;
}

.ipod-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: #000;
}

.ipod-sheet {
  --ipod-w: min(86vw, 340px);
  // Silver iPod classic; the FL theme switches to the black model (below). Read by the wheel too.
  --ipod-front: linear-gradient(180deg, #f3f3f5 0%, #dfe0e3 40%, #cdcfd3 100%);
  --ipod-brush: rgba(255, 255, 255, 0.05);
  --ipod-rim: #a7a9ae;
  --ipod-shine: rgba(255, 255, 255, 0.8);
  --wheel-face:
    radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.9), transparent 60%),
    linear-gradient(180deg, #f6f6f7 0%, #e1e2e5 55%, #d3d4d8 100%);
  --wheel-rim: #b9bbc0;
  --wheel-label: #a3a5ab;
  --wheel-center: linear-gradient(180deg, #fbfbfc 0%, #e6e7ea 100%);
  --wheel-center-pressed: linear-gradient(180deg, #e9eaed 0%, #d7d8dc 100%);
  --wheel-center-rim: #b4b6bb;
  position: fixed;
  bottom: 0;
  left: 50%;
  z-index: 50;
  margin-left: calc(var(--ipod-w) / -2);
  padding-bottom: max(env(safe-area-inset-bottom), 12px);
  transition: transform 0.38s cubic-bezier(0.25, 0.8, 0.3, 1);
  touch-action: none;
  will-change: transform;

  &--dragging {
    transition: none;
  }
}

// Sits above the device so it doesn't add to the collapsed height.
.ipod-sheet__handle {
  position: absolute;
  top: -24px;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  cursor: grab;
}

.ipod-sheet__grip {
  width: 44px;
  height: 5px;
  border-radius: 3px;
  background: var(--color-text-muted);
  opacity: 0.7;
}

.ipod-sheet__close {
  position: absolute;
  top: -6px;
  right: 0;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: rgba(20, 20, 24, 0.75);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

// iPod classic body: brushed aluminium front, rounded corners, 4:3 screen, click wheel.
.ipod {
  position: relative;
  width: var(--ipod-w);
  aspect-ratio: 1 / 1.66;
  padding: calc(var(--ipod-w) * 0.075) calc(var(--ipod-w) * 0.075) 0;
  border-radius: calc(var(--ipod-w) * 0.085);
  background:
    repeating-linear-gradient(
      90deg,
      var(--ipod-brush) 0 1px,
      rgba(0, 0, 0, 0.015) 1px 2px,
      transparent 2px 4px
    ),
    var(--ipod-front);
  box-shadow:
    inset 0 0 0 1px var(--ipod-shine),
    inset 0 -3px 8px rgba(0, 0, 0, 0.12),
    0 0 0 1px var(--ipod-rim),
    0 24px 60px rgba(0, 0, 0, 0.45);
  // Open, the body drags the sheet down; collapsed, a tap opens it.
  cursor: grab;

  .ipod-sheet:not(.ipod-sheet--open) & {
    cursor: pointer;
  }
}

.ipod__screen {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: calc(var(--ipod-w) * 0.008) solid #1a1a1c;
  border-radius: calc(var(--ipod-w) * 0.018);
  background: #000;
  box-shadow:
    0 0 0 1px #9c9ea3,
    inset 0 0 6px rgba(0, 0, 0, 0.6);
  cursor: default;
}

// Collapsed sheet shows the title bar and the mini player row.
.ipod__peek-end {
  position: absolute;
  top: calc(var(--ipod-w) * 0.075 + var(--ipod-w) * 0.062 + var(--ipod-w) * 0.15 + 4px);
  left: 0;
  width: 1px;
  height: 0;
}

.ipod__wheel {
  position: absolute;
  bottom: calc(var(--ipod-w) * 0.1);
  left: 50%;
  width: calc(var(--ipod-w) * 0.64);
  transform: translateX(-50%);
}

// Black iPod classic (2007–2009): graphite anodized front, black wheel with grey legends.
:root[data-theme='fl'] .ipod-sheet {
  --ipod-front: linear-gradient(180deg, #3a3b3f 0%, #232427 45%, #18191b 100%);
  --ipod-brush: rgba(255, 255, 255, 0.025);
  --ipod-rim: #0b0b0c;
  --ipod-shine: rgba(255, 255, 255, 0.14);
  --wheel-face:
    radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.1), transparent 60%),
    linear-gradient(180deg, #2a2b2e 0%, #1b1c1e 55%, #121314 100%);
  --wheel-rim: #050506;
  --wheel-label: #8b8d93;
  --wheel-center: linear-gradient(180deg, #2c2d30 0%, #1a1b1d 100%);
  --wheel-center-pressed: linear-gradient(180deg, #161719 0%, #222326 100%);
  --wheel-center-rim: #070708;
}

@media (min-width: 768px) {
  .ipod-backdrop,
  .ipod-dock {
    display: none;
  }

  .ipod-sheet {
    --ipod-w: 290px;
    right: 28px;
    left: auto;
    margin-left: 0;
  }
}
</style>
