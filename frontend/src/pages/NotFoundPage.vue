<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
</script>

<template>
  <div class="container page">
    <h1 class="page-title">404</h1>
    <p>{{ $t('notFound.text') }}</p>
    <div><BaseButton to="/" variant="primary">{{ $t('notFound.home') }}</BaseButton></div>
  </div>
</template>
