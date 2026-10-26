<script setup lang="ts">
import type { ReviewAuthor } from '@/types/review'

// Who wrote a review or reply: the Telegram avatar and a link to @username when signed in, and
// the "site author" badge for the owner's posts. Anonymous posts show just the typed name.
defineProps<{ name: string; author: ReviewAuthor; isOwner: boolean }>()
</script>

<template>
  <span class="author">
    <img v-if="author.photoUrl" class="author__avatar" :src="author.photoUrl" alt="" loading="lazy" />
    <strong class="author__name">{{ name }}</strong>
    <a
      v-if="author.username"
      class="author__tg"
      :href="`https://t.me/${author.username}`"
      target="_blank"
      rel="noopener"
      :title="$t('reviews.viaTelegram')"
      >@{{ author.username }}</a
    >
    <span v-else-if="author.telegram" class="author__tg" :title="$t('reviews.viaTelegram')">✈︎</span>
    <span v-if="isOwner" class="badge">✓ {{ $t('reviews.owner') }}</span>
  </span>
</template>

<style scoped>
.author {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.author__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.author__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author__tg {
  color: var(--color-accent);
  font-size: 12px;
  text-decoration: none;
}

.badge {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 11px;
  font-weight: 700;
}
</style>
