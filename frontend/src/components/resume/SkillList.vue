<script setup lang="ts">
import BaseTag from '@/components/ui/BaseTag.vue'
import type { SkillGroup } from '@/types/content'

defineProps<{ groups: SkillGroup[] }>()
</script>

<template>
  <section class="section">
    <h2>{{ $t('resume.skills') }}</h2>
    <div v-for="group in groups" :key="group.name" class="group">
      <h3>{{ group.name }}</h3>
      <ul class="items">
        <li v-for="item in group.items" :key="item">
          <BaseTag>{{ item }}</BaseTag>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group h3 {
  margin-bottom: 8px;
  font-size: 1rem;
  color: var(--color-text-muted);
}

.items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  list-style: none;
}
</style>
