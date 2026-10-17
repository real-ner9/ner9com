<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlayerStore } from '@/stores/player'

/**
 * FL Studio theme backdrop: the Playlist window behind the page. A bar ruler, track headers on
 * the left and coloured pattern clips; the playhead sweeps across while the player is playing.
 * Pure DOM + CSS gradients, fixed behind everything and ignored by the pointer.
 */
const { isPlaying } = storeToRefs(usePlayerStore())

const BARS = 40

type ClipKind = 'drums' | 'notes' | 'audio'
interface Track {
  name: string
  color: string
  kind: ClipKind
  /** [start bar, length in bars] pairs, bars counted from 0. */
  clips: [number, number][]
}

// An arrangement that reads like a real beat: intro, drop at bar 8, break, second drop.
const TRACKS: Track[] = [
  { name: 'Kick', color: '#6b8f4e', kind: 'drums', clips: [[8, 8], [20, 12]] },
  { name: 'Clap', color: '#8f5a4e', kind: 'drums', clips: [[8, 8], [20, 12]] },
  { name: 'Hi-hat', color: '#4e7d8f', kind: 'drums', clips: [[4, 12], [18, 14]] },
  { name: '808', color: '#8f7a3c', kind: 'notes', clips: [[8, 8], [20, 12]] },
  { name: 'Snare roll', color: '#7a4e8f', kind: 'drums', clips: [[6, 2], [18, 2], [30, 2]] },
  { name: 'Chords', color: '#4e8f78', kind: 'notes', clips: [[0, 16], [16, 4], [20, 12]] },
  { name: 'Lead', color: '#8f4e6e', kind: 'notes', clips: [[8, 8], [24, 8]] },
  { name: 'Pad', color: '#5a6a8f', kind: 'notes', clips: [[0, 8], [16, 4], [32, 8]] },
  { name: 'Vox chop', color: '#8f6a4e', kind: 'audio', clips: [[12, 4], [24, 4], [28, 4]] },
  { name: 'Riser', color: '#6e8f4e', kind: 'audio', clips: [[4, 4], [16, 4]] },
  { name: 'Impact', color: '#8f4e4e', kind: 'audio', clips: [[8, 1], [20, 1], [32, 1]] },
  { name: 'Perc', color: '#4e5f8f', kind: 'drums', clips: [[12, 4], [24, 8]] },
  { name: 'FX', color: '#7d8f4e', kind: 'audio', clips: [[0, 2], [15, 1], [31, 1]] },
  { name: 'Bass', color: '#8f5f3c', kind: 'notes', clips: [[20, 12]] },
  { name: 'Strings', color: '#4e8f8f', kind: 'notes', clips: [[0, 8], [32, 8]] },
  { name: 'Shaker', color: '#6a4e8f', kind: 'drums', clips: [[24, 16]] },
]

// A second, shifted copy fills tall screens.
const ROWS: Track[] = [
  ...TRACKS,
  ...TRACKS.map((track) => ({
    ...track,
    name: `${track.name} 2`,
    clips: track.clips.map(([start, length]): [number, number] => [(start + 12) % BARS, length]),
  })),
]
</script>

<template>
  <div class="playlist" aria-hidden="true">
    <div class="playlist__ruler">
      <span v-for="bar in BARS" :key="bar" class="playlist__bar-number">{{ bar }}</span>
    </div>
    <div class="playlist__body">
      <div v-for="track in ROWS" :key="track.name" class="playlist__track">
        <div class="playlist__header">
          <span class="playlist__led" />
          <span class="playlist__name">{{ track.name }}</span>
        </div>
        <div class="playlist__lane">
          <div
            v-for="[start, length] in track.clips"
            :key="start"
            class="playlist__clip"
            :class="`playlist__clip--${track.kind}`"
            :style="{
              '--clip': track.color,
              '--start': start,
              '--length': length,
            }"
          >
            <span class="playlist__clip-name">{{ track.name }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="playlist__shade" />
    <!-- Above the shade so it glows on the timeline and shows through the page window. -->
    <div class="playlist__playhead" :class="{ 'playlist__playhead--playing': isPlaying }" />
  </div>
</template>

<style scoped lang="scss">
.playlist {
  --bar: 72px;
  --header: 112px;
  --row: 42px;
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: #34424a;
  font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
  pointer-events: none;
  user-select: none;
}

// The arrangement is a backdrop, not content: softly blurred so text over it stays readable while
// it still reads as FL's Playlist. Static, so the blurred layer is painted once.
.playlist__ruler,
.playlist__body {
  filter: blur(1.5px);
}

// Bar numbers, like the Playlist's time ruler.
.playlist__ruler {
  display: flex;
  height: 22px;
  padding-left: var(--header);
  border-bottom: 1px solid #1d2427;
  background: linear-gradient(180deg, #4a565d, #3b464c);
}

.playlist__bar-number {
  flex: 0 0 var(--bar);
  padding-left: 4px;
  border-left: 1px solid #252e33;
  color: #a9b7be;
  font-size: 11px;
  line-height: 22px;
}

.playlist__track {
  display: flex;
  height: var(--row);
  border-bottom: 1px solid #2a353b;
}

.playlist__header {
  display: flex;
  flex: 0 0 var(--header);
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  border-right: 1px solid #1d2427;
  background: linear-gradient(180deg, #46525a, #3a454c);
  color: #c9d4d9;
  font-size: 11px;
}

.playlist__led {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #9ccc3d;
  box-shadow: 0 0 5px #9ccc3d;
}

.playlist__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

// Every 4 bars is shaded, with beat lines inside each bar, like FL's grid.
.playlist__lane {
  position: relative;
  flex: 1;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0 calc(var(--bar) * 4),
      rgba(0, 0, 0, 0.1) calc(var(--bar) * 4) calc(var(--bar) * 8)
    ),
    repeating-linear-gradient(90deg, #26313a 0 1px, transparent 1px var(--bar)),
    repeating-linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.12) 0 1px,
      transparent 1px calc(var(--bar) / 4)
    );
}

.playlist__clip {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: calc(var(--start) * var(--bar) + 1px);
  width: calc(var(--length) * var(--bar) - 2px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--clip) 55%, #000);
  border-radius: 3px;
  background: color-mix(in srgb, var(--clip) 70%, #1d2427);
}

// Header strip with the clip name, then the clip contents below it.
.playlist__clip-name {
  display: block;
  height: 12px;
  padding: 0 4px;
  background: color-mix(in srgb, var(--clip) 80%, #fff);
  color: #10161a;
  font-size: 9px;
  font-weight: 600;
  line-height: 12px;
  white-space: nowrap;
}

.playlist__clip::after {
  content: '';
  position: absolute;
  inset: 15px 2px 3px;
  opacity: 0.85;
}

// Drum hits: short ticks on every step.
.playlist__clip--drums::after {
  background: repeating-linear-gradient(
    90deg,
    color-mix(in srgb, var(--clip) 25%, #fff) 0 2px,
    transparent 2px calc(var(--bar) / 8)
  );
  mask: linear-gradient(transparent 30%, #000 30% 70%, transparent 70%);
}

// Melody: short note dashes at a few pitches.
.playlist__clip--notes::after {
  background:
    repeating-linear-gradient(
        90deg,
        color-mix(in srgb, var(--clip) 25%, #fff) 0 calc(var(--bar) / 5),
        transparent calc(var(--bar) / 5) calc(var(--bar) / 2)
      )
      0 20% / 100% 3px no-repeat,
    repeating-linear-gradient(
        90deg,
        transparent 0 calc(var(--bar) / 4),
        color-mix(in srgb, var(--clip) 25%, #fff) calc(var(--bar) / 4) calc(var(--bar) / 2.4),
        transparent calc(var(--bar) / 2.4) calc(var(--bar) / 2)
      )
      0 55% / 100% 3px no-repeat,
    repeating-linear-gradient(
        90deg,
        color-mix(in srgb, var(--clip) 25%, #fff) 0 calc(var(--bar) / 3),
        transparent calc(var(--bar) / 3) var(--bar)
      )
      0 85% / 100% 3px no-repeat;
}

// Audio clips: a waveform.
.playlist__clip--audio::after {
  background: repeating-linear-gradient(
    90deg,
    color-mix(in srgb, var(--clip) 25%, #fff) 0 1px,
    transparent 1px 3px
  );
  mask: radial-gradient(ellipse 60% 50% at 50% 50%, #000 40%, transparent 100%);
}

// Song position marker. Sweeps 40 bars at ~140 BPM while music plays, parked otherwise.
.playlist__playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--header);
  width: 2px;
  background: #ffe1b0;
  // Bright enough to show through the see-through page window over the middle of the playlist.
  box-shadow:
    0 0 8px rgba(255, 196, 120, 0.95),
    0 0 22px rgba(255, 140, 26, 0.6);
  animation: playhead 68.6s linear infinite paused;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -6px;
    border: 6px solid transparent;
    border-top: 8px solid #ff8c1a;
  }

  &--playing {
    animation-play-state: running;
  }
}

@keyframes playhead {
  to {
    transform: translateX(calc(var(--bar) * 40));
  }
}

// Keep the page readable: darken the middle where the content column sits.
.playlist__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(28, 35, 39, 0.45), rgba(28, 35, 39, 0.8) 30% 70%, rgba(28, 35, 39, 0.45)),
    linear-gradient(180deg, transparent 0 22px, rgba(28, 35, 39, 0.15));
}

@media (max-width: 640px) {
  .playlist {
    --bar: 52px;
    --header: 64px;
    --row: 36px;
  }

  // On phones the text spans the whole width, so the backdrop recedes further.
  .playlist__ruler,
  .playlist__body {
    filter: blur(2.5px);
  }

  .playlist__shade {
    background: rgba(28, 35, 39, 0.8);
  }

}

@media (prefers-reduced-motion: reduce) {
  .playlist__playhead {
    animation: none;
  }
}
</style>
