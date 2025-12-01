<script setup lang="ts">
defineProps<{
  name: string
  cost: number
  cookies: number
}>()

const emit = defineEmits(['click'])
</script>

<template>
  <button
    class="shop-item"
    :disabled="cookies < cost"
    @click="emit('click')"
  >
    Buy {{ name }} — {{ cost }} cookies
  </button>
</template>

<style scoped>
.shop-item {
  padding: 10px 16px;
  border: 1px solid #4ade80;
  border-radius: 8px;
  background: transparent;
  color: #d1fae5;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.shop-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.shop-item:not(:disabled):hover {
  background: rgba(74, 222, 128, 0.1);
  transform: scale(1.02);
}
</style>
