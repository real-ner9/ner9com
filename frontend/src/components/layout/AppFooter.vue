<script setup lang="ts">
import { useContent } from '@/content'

const { profile } = useContent()

const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container footer__inner">
      <span>© {{ year }} {{ profile.name }}</span>
      <nav v-if="profile.contacts.length" class="footer__contacts">
        <a
          v-for="contact in profile.contacts"
          :key="contact.href"
          :href="contact.href"
          target="_blank"
          rel="noopener"
        >
          {{ contact.label }}
        </a>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 13px;
  /* The collapsed iPod peeks over the bottom of the page. The footer itself reaches down under
     it, so its links sit above the iPod and its background runs to the bottom edge instead of
     leaving an empty strip. IpodPlayer sets --ipod-peek; +36px clears the grip above the device. */
  padding-bottom: calc(var(--ipod-peek, 140px) + 36px);
}

.footer__inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding-block: 20px;
}

.footer__contacts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}
</style>
