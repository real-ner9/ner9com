<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { THEMES, useThemeStore, type ThemeId } from '@/stores/theme'

// Header button showing the current theme's colours; opens a panel of theme previews.
const store = useThemeStore()
const { theme: current, info } = storeToRefs(store)

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function pick(next: ThemeId) {
  store.setTheme(next)
  isOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (isOpen.value && !rootRef.value?.contains(event.target as Node)) isOpen.value = false
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') isOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="rootRef" class="picker">
    <button
      type="button"
      class="picker__button icon-btn"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      :title="$t('theme.current', { name: info.label })"
      @click="isOpen = !isOpen"
    >
      <span
        class="picker__swatch"
        :style="{
          background: `conic-gradient(${info.colors[2]} 0 33%, ${info.colors[0]} 0 66%, ${info.colors[1]} 0)`,
        }"
      />
      <span class="visually-hidden">{{ $t('theme.change') }}</span>
    </button>

    <Transition name="picker">
      <div v-if="isOpen" class="picker__panel panel" :data-title="$t('theme.title')" role="menu">
        <p class="picker__title">{{ $t('theme.title') }}</p>
        <div class="picker__grid">
          <button
            v-for="theme in THEMES"
            :key="theme.id"
            type="button"
            class="picker__option"
            :class="{ 'picker__option--active': current === theme.id }"
            role="menuitemradio"
            :aria-checked="current === theme.id"
            @click="pick(theme.id)"
          >
            <!-- A tiny page: background, a card and an accent bar in the theme's colours. -->
            <span class="picker__preview" :style="{ background: theme.colors[0] }">
              <span class="picker__mini-card" :style="{ background: theme.colors[1] }">
                <span class="picker__mini-accent" :style="{ background: theme.colors[2] }" />
              </span>
            </span>
            <span class="picker__name">{{ theme.label }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.picker {
  position: relative;
}

.picker__button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  cursor: pointer;
}

// Only the swatch turns on hover, so a square button (Windows 98) stays inside its frame.
.picker__swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  transition: transform 0.2s;

  .picker__button:hover & {
    transform: rotate(30deg);
  }
}

.picker__panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 70;
  width: min(320px, calc(100vw - 24px));
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
}

.picker__title {
  margin-bottom: 10px;
  color: var(--color-text-muted);
  font-family: var(--font-label);
  font-size: 12px;
  font-weight: 600;
  text-transform: var(--label-transform);
}

.picker__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.picker__option {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
}

.picker__preview {
  position: relative;
  display: block;
  height: 58px;
  overflow: hidden;
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  transition: box-shadow 0.15s;
}

.picker__option--active .picker__preview {
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.12),
    0 0 0 2px var(--color-surface),
    0 0 0 4px var(--color-accent);
}

.picker__mini-card {
  position: absolute;
  inset: 12px 10px 10px;
  border-radius: 5px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.picker__mini-accent {
  position: absolute;
  bottom: 7px;
  left: 7px;
  width: 40%;
  height: 7px;
  border-radius: 4px;
}

.picker__name {
  color: var(--color-text);
  font-size: 12px;
}

.picker-enter-active,
.picker-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}

.picker-enter-from,
.picker-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
