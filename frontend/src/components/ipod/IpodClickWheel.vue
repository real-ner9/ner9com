<script setup lang="ts">
import { ref } from 'vue'
import { capture } from '@/utils/pointer'

/**
 * iPod click wheel. Dragging around the ring emits `scroll` steps (clockwise = +1), a short tap on
 * the ring presses the button under the finger, and the center button emits `select`.
 */
const emit = defineEmits<{
  scroll: [delta: number]
  select: []
  menu: []
  next: []
  previous: []
  playPause: []
}>()

const STEP = Math.PI / 10 // 18° of rotation per scroll step
const TAP_TOLERANCE = 0.25 // radians of total rotation still counted as a tap

const ringRef = ref<HTMLElement | null>(null)

let gesture: {
  pointerId: number
  centerX: number
  centerY: number
  startAngle: number
  lastAngle: number
  pending: number
  travelled: number
} | null = null

function angleAt(event: PointerEvent) {
  return Math.atan2(event.clientY - gesture!.centerY, event.clientX - gesture!.centerX)
}

function onPointerDown(event: PointerEvent) {
  const rect = ringRef.value!.getBoundingClientRect()
  gesture = {
    pointerId: event.pointerId,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    startAngle: 0,
    lastAngle: 0,
    pending: 0,
    travelled: 0,
  }
  gesture.startAngle = gesture.lastAngle = angleAt(event)
  capture(ringRef.value!, event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.pointerId) return
  const angle = angleAt(event)
  let delta = angle - gesture.lastAngle
  // Crossing ±180° flips the sign of atan2; unwrap so the delta stays small.
  if (delta > Math.PI) delta -= 2 * Math.PI
  if (delta < -Math.PI) delta += 2 * Math.PI
  gesture.lastAngle = angle
  gesture.pending += delta
  gesture.travelled += Math.abs(delta)

  while (gesture.pending >= STEP) {
    gesture.pending -= STEP
    step(1)
  }
  while (gesture.pending <= -STEP) {
    gesture.pending += STEP
    step(-1)
  }
}

function onPointerUp(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.pointerId) return
  if (gesture.travelled < TAP_TOLERANCE) pressAt(gesture.startAngle)
  gesture = null
}

/** Maps the tap angle to the button printed on that part of the wheel. */
function pressAt(angle: number) {
  const quarter = Math.PI / 4
  if (angle > -3 * quarter && angle < -quarter) emit('menu')
  else if (angle >= -quarter && angle <= quarter) emit('next')
  else if (angle > quarter && angle < 3 * quarter) emit('playPause')
  else emit('previous')
  click()
}

function onCenter() {
  emit('select')
  click()
}

function step(delta: number) {
  emit('scroll', delta)
  click()
}

// The real wheel clicks on every step. A 2 ms noise burst through Web Audio is close enough.
let audioContext: AudioContext | null = null
function click() {
  try {
    audioContext ??= new AudioContext()
    const ctx = audioContext
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.002), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = 0.08
    source.buffer = buffer
    source.connect(gain).connect(ctx.destination)
    source.start()
  } catch {
    // No Web Audio: silent wheel.
  }
}
</script>

<template>
  <div class="wheel" data-no-drag>
    <div
      ref="ringRef"
      class="wheel__ring"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="gesture = null"
    >
      <span class="wheel__label wheel__label--top">MENU</span>
      <span class="wheel__label wheel__label--right" aria-hidden="true">▶▶|</span>
      <span class="wheel__label wheel__label--left" aria-hidden="true">|◀◀</span>
      <span class="wheel__label wheel__label--bottom" aria-hidden="true">▶ ❚❚</span>
    </div>
    <button type="button" class="wheel__center" :aria-label="$t('ipod.select')" @click="onCenter" />
  </div>
</template>

<style scoped lang="scss">
.wheel {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.wheel__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.9), transparent 60%),
    linear-gradient(180deg, #f6f6f7 0%, #e1e2e5 55%, #d3d4d8 100%);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.9),
    inset 0 -2px 4px rgba(0, 0, 0, 0.08),
    0 0 0 1px #b9bbc0,
    0 1px 2px rgba(0, 0, 0, 0.15);
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.wheel__label {
  position: absolute;
  color: #a3a5ab;
  font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-weight: 700;
  font-size: calc(var(--ipod-w) * 0.042);
  letter-spacing: 0.04em;
  pointer-events: none;

  &--top {
    top: 9%;
    left: 50%;
    transform: translateX(-50%);
  }

  &--bottom {
    bottom: 9%;
    left: 50%;
    transform: translateX(-50%);
    font-size: calc(var(--ipod-w) * 0.034);
    letter-spacing: 0;
  }

  &--right {
    right: 7%;
    top: 50%;
    transform: translateY(-50%);
    font-size: calc(var(--ipod-w) * 0.03);
    letter-spacing: -0.12em;
  }

  &--left {
    left: 7%;
    top: 50%;
    transform: translateY(-50%);
    font-size: calc(var(--ipod-w) * 0.03);
    letter-spacing: -0.12em;
  }
}

.wheel__center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 37%;
  aspect-ratio: 1;
  border: none;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(180deg, #fbfbfc 0%, #e6e7ea 100%);
  box-shadow:
    0 0 0 1px #b4b6bb,
    inset 0 1px 1px #fff,
    inset 0 -1px 2px rgba(0, 0, 0, 0.08);
  cursor: pointer;

  &:active {
    background: linear-gradient(180deg, #e9eaed 0%, #d7d8dc 100%);
  }
}
</style>
