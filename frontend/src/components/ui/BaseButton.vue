<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

// Renders a RouterLink for `to`, an external link for `href`, otherwise a <button>.
defineProps<{
  to?: RouteLocationRaw
  href?: string
  variant?: 'primary' | 'ghost'
}>()
</script>

<template>
  <RouterLink v-if="to" :to="to" class="btn" :class="variant ?? 'ghost'"><slot /></RouterLink>
  <a
    v-else-if="href"
    :href="href"
    class="btn"
    :class="variant ?? 'ghost'"
    target="_blank"
    rel="noopener"
  >
    <slot />
  </a>
  <button v-else type="button" class="btn" :class="variant ?? 'ghost'"><slot /></button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 20px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    transform 0.15s,
    box-shadow 0.2s;
}

.btn:hover {
  border-color: var(--color-accent);
  text-decoration: none;
}

.btn:active {
  transform: scale(0.97);
}

.primary {
  border-color: transparent;
  background: var(--button-primary);
  color: var(--color-on-accent);
  box-shadow: var(--button-shadow);
}

.primary:hover {
  border-color: transparent;
  filter: brightness(1.08);
}
</style>
