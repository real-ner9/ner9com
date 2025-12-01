<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()

const links = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'AboutItems' },
  { path: '/game', label: 'Clicker Game' },
  { path: '/dik-counter', label: 'DikCounter' }
]
</script>

<template>
  <nav class="nav">
    <RouterLink
      v-for="item in links"
      :key="item.path"
      :to="item.path"
      class="nav-link"
      :class="{ active: route.path === item.path }"
    >
      {{ item.label }}
    </RouterLink>
  </nav>
</template>

<style scoped>
.nav {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding: 20px;
}

.nav-link {
  color: #d1d5db;
  border: 1px solid transparent;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-link:hover {
  border-color: #4ade80;
  background-color: rgba(74, 222, 128, 0.05);
}

.nav-link.active {
  border-color: #4ade80;
  color: white;
}
</style>
