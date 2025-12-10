<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { mode, availableThemes, cycleTheme, isAuto } = useTheme()

const label = computed(() => {
  if (mode.value === 'auto') return 'System'
  if (mode.value === 'dark') return 'Dark'
  return 'Light'
})
</script>

<template>
  <div class="theme-toggle">
    <button type="button" class="theme-toggle__button" @click="cycleTheme">
      Theme: {{ label }}
    </button>
    <select class="theme-toggle__select" v-model="mode">
      <option value="auto">System</option>
      <option v-for="theme in availableThemes" :key="theme" :value="theme">
        {{ theme }}
      </option>
    </select>
    <span v-if="isAuto" class="theme-toggle__hint">auto by OS</span>
  </div>
</template>

<style scoped lang="scss">
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
}

.theme-toggle__button {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-alt);
  color: var(--color-text);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.theme-toggle__button:hover {
  border-color: var(--color-accent);
}

.theme-toggle__select {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}

.theme-toggle__hint {
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
