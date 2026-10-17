<script setup lang="ts">
import type { ContactLink } from '@/types/content'

defineProps<{ contacts: ContactLink[] }>()

// Web links open in a new tab; mailto:/tel: hand off to the mail or phone app.
const isWeb = (href: string) => href.startsWith('http')
</script>

<template>
  <ul class="contacts">
    <li v-for="contact in contacts" :key="contact.href">
      <a
        :href="contact.href"
        class="contact panel"
        :data-title="contact.label"
        :target="isWeb(contact.href) ? '_blank' : undefined"
        :rel="isWeb(contact.href) ? 'noopener' : undefined"
      >
        <span class="contact__label">{{ contact.label }}</span>
        <span class="contact__value">{{ contact.value ?? contact.href }}</span>
      </a>
    </li>
  </ul>
</template>

<style scoped>
.contacts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
  padding: 0;
  list-style: none;
}

.contact {
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--card-shadow);
  color: var(--color-text);
  text-decoration: none;
  transition: border-color 0.2s;
}

.contact:hover {
  border-color: var(--color-accent);
}

.contact__label {
  color: var(--color-accent);
  font-family: var(--font-label);
  font-size: 11px;
  font-weight: 600;
  text-transform: var(--label-transform);
}

.contact__value {
  overflow: hidden;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
