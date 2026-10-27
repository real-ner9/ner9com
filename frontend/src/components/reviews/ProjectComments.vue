<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { fetchReviews, likeProject, type ReviewSort } from '@/api/reviews'
import CommentsSheet from '@/components/reviews/CommentsSheet.vue'
import KeefRating from '@/components/reviews/KeefRating.vue'
import { useAuthStore } from '@/stores/auth'
import type { ReviewList, ReviewProject } from '@/types/review'

/**
 * The social row under a project card, like under an Instagram post: a heart for the project,
 * the comment count, the rating in Chief Keefs and the top comment. The thread and the form open
 * in a sheet (CommentsSheet), so the cards stay compact.
 */
const props = defineProps<{ project: ReviewProject }>()

const auth = useAuthStore()
const open = ref(false)
const list = ref<ReviewList>({
  reviews: [],
  average: null,
  count: 0,
  likes: 0,
  liked: false,
  uploads: false,
  owner: false,
})
const sort = ref<ReviewSort>('top')

async function load() {
  try {
    list.value = await fetchReviews(props.project, sort.value)
  } catch {
    // The form still works; the thread just stays empty.
  }
}

watch(sort, () => void load())
// Signing in or out changes who's who on the cards (owner, "mine").
watch(
  () => `${auth.user?.name}|${auth.user?.username}|${auth.owner}`,
  () => void load(),
)
onMounted(() => void load())

// The heart changes at once and is corrected by the server's answer.
async function toggleLike() {
  const before = { likes: list.value.likes, liked: list.value.liked }
  const liked = !before.liked
  list.value = { ...list.value, liked, likes: before.likes + (liked ? 1 : -1) }
  try {
    const result = await likeProject(props.project, liked)
    list.value = { ...list.value, ...result }
  } catch {
    list.value = { ...list.value, ...before }
  }
}

// The preview follows "Top" when the visitor hasn't switched the sheet to "Newest".
const top = computed(() => list.value.reviews[0])
</script>

<template>
  <section class="social">
    <div class="social__bar">
      <button
        type="button"
        class="social__action"
        :class="{ 'social__action--liked': list.liked }"
        :aria-pressed="list.liked"
        :aria-label="list.liked ? $t('reviews.unlikeProject') : $t('reviews.likeProject')"
        @click="toggleLike"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.5 3.6 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"
          />
        </svg>
        {{ list.likes }}
      </button>
      <button
        type="button"
        class="social__action"
        :aria-label="$t('reviews.title')"
        @click="open = true"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M20.5 11.6c0 4.4-3.8 7.9-8.5 7.9-1.3 0-2.6-.3-3.7-.8L3.5 20l1.4-3.9c-.9-1.3-1.4-2.8-1.4-4.5C3.5 7.2 7.3 3.7 12 3.7s8.5 3.5 8.5 7.9Z"
          />
        </svg>
        {{ list.count }}
      </button>
      <span v-if="list.count" class="social__rating">
        <KeefRating :value="Math.round(list.average ?? 0)" :size="20" />
        <strong>{{ (list.average ?? 0).toFixed(1) }}</strong>
      </span>
    </div>

    <button v-if="top" type="button" class="social__preview" @click="open = true">
      <strong>{{ top.name }}</strong> {{ top.text }}
    </button>
    <button type="button" class="social__all" @click="open = true">
      {{ list.count ? $t('reviews.viewAll', { n: list.count }) : $t('reviews.first') }}
    </button>

    <CommentsSheet
      v-if="open"
      v-model:sort="sort"
      :project="project"
      :list="list"
      @changed="load"
      @close="open = false"
    />
  </section>
</template>

<style scoped>
.social {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  /* Sits right under the card, as one post. */
  margin-top: -8px;
  padding: 0 4px;
}

.social__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
}

.social__action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 2px;
  border: none;
  background: none;
  color: var(--color-text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.social__action svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linejoin: round;
  transition: transform 0.15s;
}

.social__action:active svg {
  transform: scale(0.85);
}

.social__action--liked svg {
  fill: var(--color-danger);
  stroke: var(--color-danger);
  animation: pop 0.3s;
}

@keyframes pop {
  50% {
    transform: scale(1.25);
  }
}

@media (prefers-reduced-motion: reduce) {
  .social__action--liked svg {
    animation: none;
  }
}

.social__rating {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
}

.social__preview {
  display: -webkit-box;
  max-width: 100%;
  padding: 0;
  overflow: hidden;
  border: none;
  background: none;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.social__all {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.social__all:hover {
  color: var(--color-accent);
}
</style>
