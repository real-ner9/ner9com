<script setup lang="ts">
import ShowcaseCard from '@/components/projects/ShowcaseCard.vue'
import ProjectComments from '@/components/reviews/ProjectComments.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { computed } from 'vue'
import { useContent } from '@/content'

// Every project with its comments, the main one first, then a link to everything else on GitHub.
const { profile, projects } = useContent()
const github = computed(() => profile.value.contacts.find((contact) => contact.label === 'GitHub'))
</script>

<template>
  <div class="container page">
    <header>
      <p class="eyebrow">{{ $t('projects.eyebrow') }}</p>
      <h1 class="page-title">{{ $t('projects.title') }}</h1>
    </header>

    <template v-for="project in projects" :key="project.id">
      <ShowcaseCard :project="project" />
      <ProjectComments :project="project.id" />
    </template>

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
