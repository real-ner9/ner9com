<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'

// Header button flipping the site between Russian and English. It shows the current language.
const { locale } = useI18n()

function toggle() {
  setLocale(locale.value === 'ru' ? 'en' : 'ru')
}
</script>

<template>
  <button type="button" class="lang icon-btn" :title="$t('language.switch')" @click="toggle">
    {{ $t('language.short') }}
  </button>
</template>

<style scoped>
.lang {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-label);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
}
</style>
