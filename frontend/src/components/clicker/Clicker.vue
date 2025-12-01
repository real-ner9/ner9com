<script setup lang="ts">
import { ref } from 'vue'
import MainCookie from './MainCookie.vue'
import Counter from './Counter.vue'
import MessageLog from './MessageLog.vue'
import Shop from './Shop.vue'

const cookies = ref(0)
const clickPower = ref(1)
const message = ref("I'm your messages, I'm empty. Do something!")

const clickers = ref(0)
const clickerCost = ref(15)
const cursorCPS = 0.1
let clickerInterval: number | null = null

function handleClick() {
  cookies.value += clickPower.value
  message.value = `You clicked! Total: ${cookies.value} cookies.`
}

function handleBuy(item: string) {
  switch (item) {
    case 'Clicker':
      if (cookies.value >= clickerCost.value) {
        cookies.value -= clickerCost.value
        clickers.value++
        clickerCost.value = Math.round(clickerCost.value * 1.5)
        message.value = `You bought 1 Clicker. Now you have ${clickers.value}.`

        if (!clickerInterval) {
          clickerInterval = setInterval(() => {
            cookies.value += cursorCPS * clickers.value
          }, 1000)
        }
      } else {
        message.value = `Not enough cookies for Clicker.`
      }
      break

    default:
      message.value = `Item "${item}" is not implemented yet.`
  }
}
</script>

<template>
  <div class="wrap main">
    <Counter :cookies="cookies" />
    <MainCookie @click-cookie="handleClick" />
    <MessageLog :message="message" />
    <Shop :cookies="cookies" @buy="handleBuy" />
  </div>
</template>

<style scoped>
.wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}
</style>
