<script setup lang="ts">
import type { PropType } from 'vue'
import type { DriveBreadcrumb } from '@/composables/useBreadcrumbs'

defineProps({
  breadcrumbs: {
    type: Array as PropType<DriveBreadcrumb[]>,
    required: true
  }
})
</script>

<template>
  <nav class="breadcrumbs">
    <template v-for="(crumb, index) in breadcrumbs" :key="`${crumb.id}-${index}`">
      <span class="breadcrumb">{{ crumb.name }}</span>
      <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 13px;
  color: #cbd5f5;
}

.breadcrumb-separator {
  opacity: 0.6;
}
</style>

