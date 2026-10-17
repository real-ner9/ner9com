<script setup lang="ts">
import BaseTag from '@/components/ui/BaseTag.vue'
import ResumeContacts from '@/components/resume/ResumeContacts.vue'
import ResumeSection from '@/components/resume/ResumeSection.vue'
import SkillList from '@/components/resume/SkillList.vue'
import { useContent } from '@/content'

const { profile, resume } = useContent()
</script>

<template>
  <div class="container page">
    <header class="intro">
      <p class="eyebrow">CV</p>
      <h1 class="page-title">{{ profile.fullName }}</h1>
      <p class="intro__role">
        {{ profile.role }}<template v-if="profile.location"> · {{ profile.location }}</template>
      </p>
      <p class="intro__summary">{{ resume.summary }}</p>
      <ResumeContacts :contacts="profile.contacts" />
    </header>
    <!-- Same order as the CVs: skills first, then experience. -->
    <SkillList :groups="resume.skills" />
    <ResumeSection :title="$t('resume.experience')" :entries="resume.experience" show-total />
    <ResumeSection :title="$t('resume.education')" :entries="resume.education" />
    <section class="languages">
      <h2>{{ $t('resume.languages') }}</h2>
      <ul>
        <li v-for="language in resume.languages" :key="language">
          <BaseTag>{{ language }}</BaseTag>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.intro {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.intro__role {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
}

.intro__summary {
  max-width: 72ch;
  color: var(--color-text-muted);
}

.languages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.languages ul {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  list-style: none;
}
</style>
