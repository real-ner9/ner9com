<script setup lang="ts">
import ShopItem from './ShopItem.vue'

defineProps<{
  cookies: number
}>()

const emit = defineEmits<{
  (e: 'buy', item: string): void
}>()

const items = [
  { name: 'Clicker', cost: 15 },
  { name: 'Grandma', cost: 100 },
  { name: 'Farm', cost: 1100 },
  { name: 'Mine', cost: 12000 },
  { name: 'Factory', cost: 130000 },
  { name: 'Bank', cost: 1200000 },
  { name: 'Temple', cost: 20000000 },
  { name: 'Tower', cost: 330000000 }
]
</script>

<template>
  <div class="shop">
    <ShopItem
      v-for="item in items"
      :key="item.name"
      :name="item.name"
      :cost="item.cost"
      :cookies="cookies"
      @click="emit('buy', item.name)"
    />
  </div>
</template>

<style scoped>
.shop {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
}
</style>
