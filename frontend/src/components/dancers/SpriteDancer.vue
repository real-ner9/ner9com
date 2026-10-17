<script setup lang="ts">
import { computed } from 'vue'
import type { DancerSprite } from '@/components/dancers/sprites'

/** One frame of a sprite sheet, drawn as a CSS background (no canvas needed). */
const props = defineProps<{
  sprite: DancerSprite
  row: string
  frame: number
  /** Display width in px; height follows the cell aspect ratio. */
  width: number
  /** Hue shift in degrees, to tell the two dancers apart. */
  hue?: number
  mirrored?: boolean
}>()

const height = computed(() => (props.width * props.sprite.cellHeight) / props.sprite.cellWidth)
// Small dancers use the half-resolution sheet: same layout, a quarter of the pixels.
const url = computed(() =>
  props.width <= props.sprite.cellWidth / 2 ? props.sprite.smallUrl : props.sprite.url,
)
const rowIndex = computed(() => Math.max(props.sprite.rows.indexOf(props.row), 0))

const style = computed(() => ({
  width: `${props.width}px`,
  height: `${height.value}px`,
  backgroundImage: `url(${url.value})`,
  backgroundSize: `${props.width * props.sprite.columns}px auto`,
  backgroundPosition: `${-props.frame * props.width}px ${-rowIndex.value * height.value}px`,
  filter: props.hue ? `hue-rotate(${props.hue}deg)` : undefined,
  transform: props.mirrored ? 'scaleX(-1)' : undefined,
}))
</script>

<template>
  <div class="dancer" :style="style" role="img" :aria-label="$t('dance.dancer')" />
</template>

<style scoped>
.dancer {
  background-repeat: no-repeat;
  pointer-events: none;
}
</style>
