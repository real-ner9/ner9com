<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <button :title="title" class="list-style-button">{{title}}</button>
</template>

<style scoped>
.list-style-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 500;
  color: #d1d5db; /* Светло-серый */
  transition: background-color 0.2s, border-color 0.2s;
  cursor: pointer;
}

.list-style-button:hover {
  border-color: #4ade80; /* Светло-зелёный */
  background-color: rgba(74, 222, 128, 0.05); /* Лёгкий зелёный фон при наведении */
  color: #ffffff;
}

.list-style-button:active {
  transform: scale(0.98);
}
</style>
