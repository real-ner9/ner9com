<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <p class="log">{{ message }}</p>
</template>

<style scoped>
.log {
  font-size: 16px;
  color: #9ca3af;
  text-align: center;
  margin-top: 12px;
  max-width: 400px;
}
</style>
