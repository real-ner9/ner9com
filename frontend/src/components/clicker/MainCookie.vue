<script setup lang="ts">
const emit = defineEmits<{
  (e: 'click-cookie'): void
}>()
</script>

<template>
  <div class="main-cookie" @click="emit('click-cookie')">
    <div class="chip chip1" />
    <div class="chip chip2" />
    <div class="chip chip3" />
    <div class="chip chip4" />
    <div class="chip chip5" />
    <div class="chip chip6" />
    <div class="chip chip7" />
    <div class="chip chip8" />
  </div>
</template>

<style scoped>
.main-cookie {
  width: 200px;
  height: 200px;
  background: radial-gradient(#d2691e, #8b4513);
  border-radius: 50%;
  position: relative;
  cursor: pointer;
  margin: 20px auto;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
}

.chip {
  width: 20px;
  height: 20px;
  background: #3e2a14;
  border-radius: 50%;
  position: absolute;
}

.chip1 { top: 20px; left: 40px; }
.chip2 { top: 50px; left: 80px; }
.chip3 { top: 90px; left: 30px; }
.chip4 { top: 140px; left: 60px; }
.chip5 { top: 100px; left: 120px; }
.chip6 { top: 40px; left: 130px; }
.chip7 { top: 70px; left: 160px; }
.chip8 { top: 150px; left: 100px; }
</style>
