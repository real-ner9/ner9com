<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LOCALES, setLocale, type Locale } from '@/i18n'

// Header button cycling the site language (Russian → Ukrainian → English). It shows the current one.
const { locale } = useI18n()

function toggle() {
  const next = (LOCALES.indexOf(locale.value as Locale) + 1) % LOCALES.length
  setLocale(LOCALES[next]!)
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
