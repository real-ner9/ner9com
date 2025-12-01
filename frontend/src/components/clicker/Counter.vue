<script setup lang="ts">
defineProps<{
  cookies: number
}>()
</script>

<template>
  <p class="counter">{{ cookies }} cookies</p>
</template>

<style scoped>
.counter {
  font-size: 24px;
  font-weight: bold;
  color: #f3f4f6;
  text-align: center;
  margin: 16px 0;
}
</style>
