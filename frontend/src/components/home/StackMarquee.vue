<script setup lang="ts">
// Endless strip of technologies. The list is rendered twice and shifted by exactly one copy,
// so the loop is seamless.
defineProps<{ items: string[] }>()
</script>

<template>
  <div class="marquee" :aria-label="$t('home.stack')">
    <div class="marquee__track">
      <template v-for="copy in 2" :key="copy">
        <span
          v-for="item in items"
          :key="`${copy}-${item}`"
          class="marquee__item"
          :aria-hidden="copy === 2"
        >
          {{ item }}
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.marquee {
  overflow: hidden;
  padding-block: 14px;
  border-block: 1px solid var(--color-border);
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}

.marquee__track {
  display: flex;
  width: max-content;
  animation: scroll 40s linear infinite;
}

.marquee__item {
  display: inline-flex;
  align-items: center;
  gap: 28px;
  padding-right: 28px;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 4vw, 1.6rem);
  font-weight: var(--heading-weight);
  letter-spacing: var(--heading-tracking);
  white-space: nowrap;

  &::after {
    content: '✦';
    color: var(--color-accent);
    font-size: 0.6em;
  }
}

@keyframes scroll {
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .marquee__track {
    animation: none;
  }
}
</style>
