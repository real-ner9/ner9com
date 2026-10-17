<script setup lang="ts">
// The owner's own clothing line; nothing to show yet, so for now just a placeholder card.
</script>

<template>
  <div class="container page">
    <header>
      <p class="eyebrow">{{ $t('clothes.eyebrow') }}</p>
      <h1 class="page-title">{{ $t('clothes.title') }}</h1>
    </header>

    <section class="card panel soon" :data-title="$t('clothes.title')">
      <p class="status">{{ $t('clothes.status') }}</p>
      <p class="soon__text">{{ $t('clothes.text') }}</p>
    </section>
  </div>
</template>

<style scoped>
.soon {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 60ch;
}

.soon__text {
  color: var(--color-text);
}
</style>
