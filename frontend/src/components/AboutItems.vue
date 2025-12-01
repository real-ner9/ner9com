<script setup lang="ts">
import Button from '@/components/Button.vue'
import { ref } from 'vue'

const selectedItem = ref(1)

const items = [
  { id: 1, name: 'Vue.js Basics' },
  { id: 2, name: 'Vue.js Components' },
  { id: 3, name: 'Vue.js Directives' },
  { id: 4, name: 'Vue.js Lifecycle Hooks' },
  { id: 5, name: 'Vue.js State Management' }
]

const handleItemClick = (itemId: number) => {
  if (itemId < 1 || itemId > items.length) return
  selectedItem.value = itemId
}
</script>

<template>
  <div class="list">
    <div
      v-for="item in items"
      :key="item.id"
      class="list-item"
      :class="{ selected: selectedItem === item.id }"
      @click="handleItemClick(item.id)"
    >
      <div class="circle">{{ item.id }}</div>
      <p class="label">{{ item.name }}</p>
    </div>

    <div class="nav">
      <Button title="Prev" @click="handleItemClick(selectedItem - 1)" />
      <Button title="Next" @click="handleItemClick(selectedItem + 1)" />
    </div>
  </div>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  cursor: pointer;
  width: 280px;
  transition: border-color 0.2s;
}

.list-item:hover {
  border-color: #4ade80;
}

.list-item.selected {
  border-color: #4ade80;
  background-color: rgba(74, 222, 128, 0.05);
}

.circle {
  background-color: #4ade80;
  color: black;
  font-weight: 600;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.label {
  color: #d1d5db;
  font-size: 16px;
}

.nav {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
</style>
