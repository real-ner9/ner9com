<script setup lang="ts">
import DanceToggle from '@/components/layout/DanceToggle.vue'
import ThemePicker from '@/components/layout/ThemePicker.vue'
import LanguageToggle from '@/components/layout/LanguageToggle.vue'
import { useContent } from '@/content'

const { profile } = useContent()

const links = [
  { to: '/', label: 'nav.home' },
  { to: '/projects', label: 'nav.projects' },
  { to: '/resume', label: 'nav.resume' },
]
</script>

<template>
  <header class="header">
    <div class="container header__inner">
      <RouterLink to="/" class="header__logo">
        {{ profile.name }}<span class="header__dot">.</span>
      </RouterLink>

      <nav class="header__nav">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="header__link"
          exact-active-class="header__link--active"
        >
          {{ $t(link.label) }}
        </RouterLink>
      </nav>

      <div class="header__actions">
        <LanguageToggle />
        <DanceToggle />
        <ThemePicker />
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid var(--color-border);
  background: var(--header-bg);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
}

.header__inner {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 56px;
}

.header__logo {
  color: var(--color-text);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.2rem;
  letter-spacing: -0.03em;

  &:hover {
    text-decoration: none;
  }
}

.header__dot {
  color: var(--color-accent);
}

.header__nav {
  display: flex;
  flex: 1;
  gap: 4px;
}

.header__link {
  position: relative;
  padding: 6px 12px;
  border-radius: 999px;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 500;
  transition:
    color 0.15s,
    background-color 0.15s;

  &:hover {
    color: var(--color-text);
    text-decoration: none;
  }

  &--active {
    background: var(--color-accent-soft);
    color: var(--color-accent);
  }
}

.header__actions {
  display: flex;
  gap: 8px;
}

// Phones: logo and buttons on top, the nav as a second row of pills.
@media (max-width: 640px) {
  .header__inner {
    flex-wrap: wrap;
    gap: 6px 10px;
    height: auto;
    padding-block: 10px 8px;
  }

  .header__logo {
    flex: 1;
  }

  .header__nav {
    order: 3;
    flex-basis: 100%;
    margin-inline: -8px;
    overflow-x: auto;
    scrollbar-width: none;
  }
}
</style>
