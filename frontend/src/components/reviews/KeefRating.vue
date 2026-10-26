<script setup lang="ts">
import { ref } from 'vue'
import chiefKeef from '@/assets/reviews/chief-keef.webp'

/**
 * The rating in Chief Keefs instead of stars (the owner's idea): five square Keef faces, the first
 * `value` of them lit (in colour, ringed in the theme accent), the rest grey. Editable, it's a
 * radio group with a hover preview.
 */
const props = withDefaults(defineProps<{ value: number; size?: number; editable?: boolean }>(), {
  size: 24,
  editable: false,
})
const emit = defineEmits<{ 'update:value': [value: number] }>()

const KEEFS = [1, 2, 3, 4, 5]
const hover = ref<number | null>(null)
const lit = (n: number) => n <= (hover.value ?? props.value)
</script>

<template>
  <span
    v-if="editable"
    class="keefs keefs--edit"
    role="radiogroup"
    :aria-label="$t('reviews.rating')"
    :style="{ '--size': `${size}px` }"
    @pointerleave="hover = null"
  >
    <button
      v-for="n in KEEFS"
      :key="n"
      type="button"
      role="radio"
      class="keef"
      :class="{ 'keef--on': lit(n) }"
      :aria-checked="value === n"
      :aria-label="$t('reviews.star', n)"
      @click="emit('update:value', n)"
      @pointerenter="hover = n"
    >
      <img :src="chiefKeef" alt="" draggable="false" />
    </button>
  </span>
  <span
    v-else
    class="keefs"
    role="img"
    :aria-label="$t('reviews.star', Math.round(value))"
    :style="{ '--size': `${size}px` }"
  >
    <span v-for="n in KEEFS" :key="n" class="keef" :class="{ 'keef--on': lit(n) }">
      <img :src="chiefKeef" alt="" draggable="false" />
    </span>
  </span>
</template>

<style scoped>
.keefs {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--size) * 0.22);
  padding: 3px;
}

.keef {
  display: block;
  padding: 0;
  border: none;
  background: none;
  line-height: 0;
  opacity: 0.35;
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.keef img {
  width: var(--size);
  height: var(--size);
  border-radius: 2px;
  filter: grayscale(1);
}

.keef--on {
  opacity: 1;
}

/* Lit Keefs: in colour, ringed and glowing in the theme's accent (orange in FL, blue in Apple). */
.keef--on img {
  filter: none;
  box-shadow:
    0 0 0 2px var(--color-accent),
    0 0 10px var(--color-accent);
}

/* Editable: no gap or padding around the Keefs, so the hover preview ends the moment the pointer
   leaves them; the spacing lives inside the buttons, between neighbours only. */
.keefs--edit {
  /* Not stretched across a flex column (the form's field): its box must end with the last Keef. */
  align-self: flex-start;
  gap: 0;
  padding: 0;
}

.keefs--edit .keef {
  padding: 0 calc(var(--size) * 0.11);
  cursor: pointer;
}

.keefs--edit .keef:first-child {
  padding-left: 0;
}

.keefs--edit .keef:last-child {
  padding-right: 0;
}

.keefs--edit .keef--on {
  transform: translateY(-2px);
}

.keefs--edit .keef:active {
  transform: scale(0.92);
}
</style>
