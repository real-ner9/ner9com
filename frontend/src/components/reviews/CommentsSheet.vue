<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import type { ReviewSort } from '@/api/reviews'
import ReviewCard from '@/components/reviews/ReviewCard.vue'
import ReviewForm from '@/components/reviews/ReviewForm.vue'
import { useAuthStore } from '@/stores/auth'
import type { ReviewList, ReviewProject } from '@/types/review'

// A project's comments over the page, like Instagram's: the thread with "Top / Newest" and the
// form pinned at the bottom. A bottom sheet on phones, a centred window on desktop. Closes on
// ✕, the backdrop or Esc; the page behind doesn't scroll meanwhile.
defineProps<{ project: ReviewProject; list: ReviewList }>()
const sort = defineModel<ReviewSort>('sort', { required: true })
const emit = defineEmits<{ changed: []; close: [] }>()

const auth = useAuthStore()
const SORTS: ReviewSort[] = ['top', 'new']

// Images open their own lightbox over the sheet, which handles Esc itself.
const onKey = (event: KeyboardEvent) =>
  event.key === 'Escape' && !document.querySelector('.lightbox') && emit('close')
onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.documentElement.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <!-- No .panel: the skins' window chrome would repeat the title and the close button. -->
      <section class="sheet" role="dialog" aria-modal="true" :aria-label="$t('reviews.title')">
        <header class="sheet__head">
          <h2 class="sheet__title">
            {{ $t('reviews.title') }}
            <span v-if="list.count" class="sheet__count">{{ list.count }}</span>
          </h2>
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
          <button
            type="button"
            class="sheet__close"
            :aria-label="$t('reviews.close')"
            @click="emit('close')"
          >
            ✕
          </button>
        </header>

        <div class="sheet__body">
          <ul v-if="list.reviews.length" class="list">
            <ReviewCard
              v-for="review in list.reviews"
              :key="`${review.id}:${review.replies.length}:${review.likes}:${review.dislikes}`"
              :review="review"
              :uploads="list.uploads"
              :owner="list.owner"
              :signed-in="Boolean(auth.user)"
              @changed="emit('changed')"
            />
          </ul>
          <p v-else class="status sheet__empty">{{ $t('reviews.empty') }}</p>
        </div>

        <ReviewForm
          class="sheet__form"
          :project="project"
          :uploads="list.uploads"
          @posted="emit('changed')"
        />
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(0 0 0 / 0.5);
  animation: fade 0.2s;
}

.sheet {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 88dvh;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-bottom: none;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--color-surface);
  box-shadow: var(--card-shadow);
  animation: rise 0.25s ease-out;
}

@media (min-width: 768px) {
  .backdrop {
    align-items: center;
    padding: 24px;
  }

  .sheet {
    max-width: 620px;
    height: min(760px, 86vh);
    border-bottom: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

@keyframes rise {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .backdrop,
  .sheet {
    animation: none;
  }
}

.sheet__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.sheet__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: var(--heading-weight);
}

.sheet__count {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.sheet__close {
  margin-left: auto;
  padding: 4px 8px;
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: 18px;
  cursor: pointer;
}

.sheet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 16px;
}

.sheet__empty {
  padding: 32px 0;
  text-align: center;
}

.sheet__form {
  border-top: 1px solid var(--color-border);
}

.sort {
  display: flex;
  gap: 6px;
}

.sort__option {
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.sort__option--on {
  border-color: var(--color-text);
  background: var(--color-text);
  color: var(--color-surface);
}

.list {
  display: flex;
  flex-direction: column;
  padding: 0;
  list-style: none;
}
</style>
