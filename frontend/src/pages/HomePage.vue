<script setup lang="ts">
import NowPlayingChip from '@/components/home/NowPlayingChip.vue'
import StackMarquee from '@/components/home/StackMarquee.vue'
import ShowcaseCard from '@/components/projects/ShowcaseCard.vue'
import ProjectComments from '@/components/reviews/ProjectComments.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useContent } from '@/content'
import { useIpodStore } from '@/stores/ipod'

const ipod = useIpodStore()
const { profile, showcase } = useContent()
</script>

<template>
  <div class="home">
    <section class="container hero">
      <NowPlayingChip class="hero__chip" />
      <h1 class="hero__name">{{ profile.name }}</h1>
      <p class="hero__role">{{ profile.role }}<span class="hero__cursor" aria-hidden="true" /></p>
      <p class="hero__summary">{{ profile.summary }}</p>
      <div class="hero__actions">
        <BaseButton to="/projects" variant="primary">{{ $t('home.viewProjects') }}</BaseButton>
        <BaseButton to="/cv">{{ $t('home.resume') }}</BaseButton>
        <BaseButton @click="ipod.expand">{{ $t('home.music') }}</BaseButton>
      </div>
    </section>

    <StackMarquee :items="profile.stack" />

    <section class="container featured">
      <header class="featured__header">
        <div>
          <p class="eyebrow">{{ $t('home.featuredEyebrow') }}</p>
          <h2 class="featured__title">{{ $t('home.featuredTitle') }}</h2>
        </div>
        <RouterLink to="/cv" class="featured__all">{{ $t('home.experience') }}</RouterLink>
      </header>
      <ShowcaseCard :project="showcase" />
      <ProjectComments :project="showcase.id" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: column;
  gap: 48px;
  padding-bottom: 56px;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding-top: clamp(32px, 8vw, 88px);
}

.hero__name {
  // Fills most of a phone screen and scales up on desktop.
  font-size: clamp(4.5rem, 24vw, 10rem);
  font-weight: 800;
  line-height: 0.88;
  letter-spacing: -0.06em;
  // The tight tracking pulls the box in past the last glyph, and the gradient (clipped to the
  // text) stopped there, cutting off the right edge of the "9".
  padding-right: 0.08em;
  background: var(--hero-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(var(--glow));
}

.hero__role {
  display: flex;
  align-items: center;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(1.2rem, 4.5vw, 1.6rem);
  font-weight: 600;
  letter-spacing: -0.01em;
}

// Terminal-style blinking caret after the role.
.hero__cursor {
  width: 0.5em;
  height: 1.05em;
  margin-left: 6px;
  border-radius: 2px;
  background: var(--color-accent);
  animation: blink 1.1s steps(2, start) infinite;
}

@keyframes blink {
  to {
    visibility: hidden;
  }
}

.hero__summary {
  max-width: 54ch;
  color: var(--color-text-muted);
  font-size: 1.05rem;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.featured {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.featured__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.featured__title {
  font-size: clamp(1.6rem, 6vw, 2.4rem);
}

.featured__all {
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .hero__cursor {
    animation: none;
  }
}
</style>
