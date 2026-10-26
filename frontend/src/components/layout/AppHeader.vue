<script setup lang="ts">
import AuthButton from '@/components/layout/AuthButton.vue'
import DanceToggle from '@/components/layout/DanceToggle.vue'
import IpodToggle from '@/components/layout/IpodToggle.vue'
import ThemePicker from '@/components/layout/ThemePicker.vue'
import LanguageToggle from '@/components/layout/LanguageToggle.vue'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useContent } from '@/content'

const { profile } = useContent()

const links = [
  { to: '/', label: 'nav.home' },
  { to: '/projects', label: 'nav.projects' },
  { to: '/cv', label: 'nav.resume' },
  { to: '/clothes', label: 'nav.clothes' },
]

// Slides away while scrolling down and comes back on any scroll up, like mobile browser bars.
// It stays near the top of the page and while something in it has focus (an open menu).
const MIN_DELTA = 6
const header = ref<HTMLElement | null>(null)
const hidden = ref(false)
let lastY = 0
let frame = 0

function update() {
  frame = 0
  const y = Math.max(window.scrollY, 0)
  const delta = y - lastY
  if (Math.abs(delta) < MIN_DELTA) return
  const height = header.value?.offsetHeight ?? 0
  const busy = header.value?.matches(':focus-within') ?? false
  hidden.value = delta > 0 && y > height && !busy
  lastY = y
}

const onScroll = () => {
  if (!frame) frame = requestAnimationFrame(update)
}

const route = useRoute()
watch(
  () => route.path,
  () => (hidden.value = false),
)

onMounted(() => {
  lastY = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <header
    ref="header"
    class="header"
    :class="{ 'header--hidden': hidden }"
    @focusin="hidden = false"
  >
    <div class="container header__inner">
      <RouterLink to="/" class="header__logo">
        {{ profile.name }}<span class="header__dot">.</span>COM
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
        <IpodToggle />
        <DanceToggle />
        <ThemePicker />
        <AuthButton />
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
  transition: transform 0.25s ease;

  &--hidden {
    // A little further than its height, so the shadow some skins give it doesn't peek out.
    transform: translateY(calc(-100% - 12px));
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
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
