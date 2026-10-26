<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { fetchReviews, type ReviewSort } from '@/api/reviews'
import KeefRating from '@/components/reviews/KeefRating.vue'
import ReviewCard from '@/components/reviews/ReviewCard.vue'
import ReviewForm from '@/components/reviews/ReviewForm.vue'
import { useAuthStore } from '@/stores/auth'
import type { ReviewList, ReviewProject } from '@/types/review'

/**
 * Comments under one of the owner's projects: the rating in Chief Keefs, the form and the
 * thread, sorted "Top" (like YouTube) or "Newest". `collapsed` starts it folded to the summary
 * (the home page), so the card stays the first thing you see.
 */
const props = defineProps<{ project: ReviewProject; collapsed?: boolean }>()

const auth = useAuthStore()
const open = ref(!props.collapsed)
const list = ref<ReviewList>({ reviews: [], average: null, count: 0, uploads: false, owner: false })

const SORTS: ReviewSort[] = ['top', 'new']
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
</script>

<template>
  <section class="comments">
    <header class="comments__head">
      <h3 class="comments__title">{{ $t('reviews.title') }}</h3>
      <p v-if="list.count" class="comments__summary">
        <KeefRating :value="Math.round(list.average ?? 0)" :size="26" />
        <strong>{{ (list.average ?? 0).toFixed(1) }}</strong>
        · {{ $t('reviews.count', list.count) }}
      </p>
      <button type="button" class="comments__toggle" :aria-expanded="open" @click="open = !open">
        {{ open ? $t('reviews.hide') : $t('reviews.show') }}
      </button>
    </header>

    <template v-if="open">
      <ReviewForm :project="project" :uploads="list.uploads" @posted="load" />

      <div
        v-if="list.reviews.length > 1"
        class="sort"
        role="tablist"
        :aria-label="$t('reviews.sortLabel')"
      >
        <button
          v-for="option in SORTS"
          :key="option"
          type="button"
          role="tab"
          class="sort__option"
          :class="{ 'sort__option--on': sort === option }"
          :aria-selected="sort === option"
          @click="sort = option"
        >
          {{ option === 'top' ? $t('reviews.sortTop') : $t('reviews.sortNew') }}
        </button>
      </div>

      <ul v-if="list.reviews.length" class="list">
        <ReviewCard
          v-for="review in list.reviews"
          :key="`${review.id}:${review.replies.length}:${review.likes}:${review.dislikes}`"
          :review="review"
          :uploads="list.uploads"
          :owner="list.owner"
          :signed-in="Boolean(auth.user)"
          @changed="load"
        />
      </ul>
      <p v-else class="status">{{ $t('reviews.empty') }}</p>
    </template>
  </section>
</template>

<style scoped>
.comments {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comments__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
}

.comments__title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: var(--heading-weight);
}

.comments__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-muted);
}

.comments__toggle {
  margin-left: auto;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.sort {
  display: flex;
  gap: 6px;
}

.sort__option {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.sort__option--on {
  border-color: var(--color-text);
  background: var(--color-text);
  color: var(--color-surface);
}

.list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr));
  align-items: start;
  gap: 12px;
  padding: 0;
  list-style: none;
}
</style>
