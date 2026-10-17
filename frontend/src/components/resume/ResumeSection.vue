<script setup lang="ts">
import BaseTag from '@/components/ui/BaseTag.vue'
import type { ResumeEntry } from '@/types/content'

defineProps<{
  title: string
  entries: ResumeEntry[]
}>()
</script>

<template>
  <section class="section">
    <h2>{{ title }}</h2>
    <article v-for="entry in entries" :key="entry.title + entry.organization" class="entry">
      <header class="entry-header">
        <h3>{{ entry.title }} · {{ entry.organization }}</h3>
        <span class="period">{{ entry.period }}</span>
      </header>
      <p v-if="entry.context" class="context">{{ entry.context }}</p>
      <ul v-if="entry.roles" class="roles">
        <li v-for="role in entry.roles" :key="role.title">
          {{ role.title }} <span class="period">{{ role.period }}</span>
        </li>
      </ul>
      <ul v-if="entry.points.length" class="points">
        <li v-for="point in entry.points" :key="point">{{ point }}</li>
      </ul>
      <ul v-if="entry.stack" class="stack">
        <li v-for="item in entry.stack" :key="item"><BaseTag>{{ item }}</BaseTag></li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.entry {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 16px;
  border-left: 2px solid var(--color-accent);
}

.entry-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
}

.entry-header h3 {
  font-size: 1.05rem;
}

.period,
.context {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.roles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  font-size: 0.9rem;
  list-style: none;
}

.points {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  padding-left: 20px;
  /* The achievements are the main text of the resume: full contrast, not muted. */
  color: var(--color-text);
  line-height: 1.55;
}

.stack {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  padding: 0;
  list-style: none;
}
</style>
