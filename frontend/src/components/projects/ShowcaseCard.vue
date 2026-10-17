<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTag from '@/components/ui/BaseTag.vue'
import type { ShowcaseProject } from '@/types/content'

// The big card for the main project: what it is, the stack, the link and a promo code to copy.
const props = defineProps<{ project: ShowcaseProject }>()

const copied = ref(false)
async function copyCode() {
  if (!props.project.promoCode) return
  try {
    await navigator.clipboard.writeText(props.project.promoCode)
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {
    // No clipboard access (insecure context): the code is visible anyway.
  }
}
</script>

<template>
  <article class="showcase panel" :data-title="`${project.name}.exe`">
    <div class="showcase__glow" aria-hidden="true" />
    <p class="showcase__status"><span class="showcase__dot" />{{ project.status }}</p>
    <h3 class="showcase__name">{{ project.name }}</h3>
    <p class="showcase__tagline">{{ project.tagline }}</p>
    <p class="showcase__description">{{ project.description }}</p>

    <ul class="showcase__stack">
      <li v-for="item in project.stack" :key="item"><BaseTag>{{ item }}</BaseTag></li>
    </ul>

    <div class="showcase__actions">
      <BaseButton :href="project.url" variant="primary">{{ project.linkLabel }} →</BaseButton>
      <button
        v-if="project.promoCode"
        type="button"
        class="showcase__promo"
        :title="copied ? $t('projects.copied') : $t('projects.copy')"
        @click="copyCode"
      >
        <span class="showcase__promo-label">{{ copied ? `${$t('projects.copied')} ✓` : $t('projects.promo') }}</span>
        <span class="showcase__promo-code">{{ project.promoCode }}</span>
      </button>
    </div>
    <p v-if="project.promoCode" class="showcase__hint">
      {{ $t('projects.promoHint') }}
    </p>
  </article>
</template>

<style scoped lang="scss">
.showcase {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  overflow: hidden;
  padding: clamp(22px, 5vw, 40px);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--card-shadow);
}

// Soft accent light in the corner, tinted by the theme.
.showcase__glow {
  position: absolute;
  top: -40%;
  right: -20%;
  width: 70%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, var(--color-accent-soft), transparent 70%);
  pointer-events: none;
}

.showcase__status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-family: var(--font-label);
  font-size: 12px;
  font-weight: 600;
  text-transform: var(--label-transform);
}

// Pulsing "live" dot.
.showcase__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 0 0 var(--color-success);
  animation: live 1.8s ease-out infinite;
}

@keyframes live {
  to {
    box-shadow: 0 0 0 8px transparent;
  }
}

.showcase__name {
  font-size: clamp(2.4rem, 10vw, 4rem);
  line-height: 1.05;
  background: var(--hero-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.showcase__tagline {
  font-family: var(--font-display);
  font-size: clamp(1.1rem, 4vw, 1.4rem);
  font-weight: 600;
}

.showcase__description {
  max-width: 60ch;
  color: var(--color-text-muted);
}

.showcase__stack {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  list-style: none;
}

.showcase__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.showcase__promo {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 16px;
  border: 1px dashed var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--color-accent-soft);
  color: var(--color-text);
  font: inherit;
  cursor: pointer;
}

.showcase__promo-label {
  color: var(--color-accent);
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 600;
  text-transform: var(--label-transform);
}

.showcase__promo-code {
  font-family: var(--font-label);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.showcase__hint {
  color: var(--color-text-muted);
  font-size: 13px;
}

@media (prefers-reduced-motion: reduce) {
  .showcase__dot {
    animation: none;
  }
}
</style>
