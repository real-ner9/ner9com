<script setup lang="ts">
import ShowcaseCard from '@/components/projects/ShowcaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { computed } from 'vue'
import { useContent } from '@/content'

// The main project, then a link to everything else on GitHub.
const { profile, showcase } = useContent()
const github = computed(() => profile.value.contacts.find((contact) => contact.label === 'GitHub'))
</script>

<template>
  <div class="container page">
    <header>
      <p class="eyebrow">{{ $t('projects.eyebrow') }}</p>
      <h1 class="page-title">{{ $t('projects.title') }}</h1>
    </header>

    <ShowcaseCard :project="showcase" />

    <p v-if="github" class="more">
      {{ $t('projects.rest') }}
      <BaseButton :href="github.href">github.com/{{ github.value }}</BaseButton>
    </p>
  </div>
</template>

<style scoped>
.more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  color: var(--color-text-muted);
}
</style>
