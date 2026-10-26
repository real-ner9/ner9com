<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { deleteReply, deleteReview, postReply, vote } from '@/api/reviews'
import BaseButton from '@/components/ui/BaseButton.vue'
import ImageGrid from '@/components/reviews/ImageGrid.vue'
import ImagePicker from '@/components/reviews/ImagePicker.vue'
import KeefRating from '@/components/reviews/KeefRating.vue'
import PostAuthor from '@/components/reviews/PostAuthor.vue'
import type { Review, ReviewImage } from '@/types/review'

// One review: rating in Chief Keefs, text, images, likes/dislikes, replies and a reply form. The
// reply field is an injection trap too (the backend bans on it). Delete shows on the visitor's
// own posts (signed in with Telegram) and, for the owner, on every post.
const props = defineProps<{
  review: Review
  uploads: boolean
  owner: boolean
  /** Signed in with Telegram: replies take the account's name. */
  signedIn: boolean
}>()
const emit = defineEmits<{ changed: [] }>()

const { t, locale } = useI18n()

const date = (iso: string) =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  )

// Votes change at once and are corrected by the server's answer.
const votes = ref({ likes: props.review.likes, dislikes: props.review.dislikes, mine: props.review.myVote })
async function castVote(value: 1 | -1) {
  const next = votes.value.mine === value ? 0 : value
  const before = { ...votes.value }
  const delta = (v: number, side: number) => (v === side ? 1 : 0)
  votes.value = {
    likes: before.likes - delta(before.mine, 1) + delta(next, 1),
    dislikes: before.dislikes - delta(before.mine, -1) + delta(next, -1),
    mine: next,
  }
  try {
    const result = await vote(props.review.id, next as -1 | 0 | 1)
    votes.value = { likes: result.likes, dislikes: result.dislikes, mine: result.myVote }
  } catch {
    votes.value = before
  }
}

const replying = ref(false)
const replyName = ref('')
const replyText = ref('')
const replyImages = ref<ReviewImage[]>([])
const sending = ref(false)
const error = ref<string | null>(null)
// Empty fields are pointed out on send (signed in, the Telegram name is used).
const tried = ref(false)
const replyErrors = computed(() => ({
  name: tried.value && !props.signedIn && !replyName.value.trim() ? t('reviews.nameRequired') : null,
  text: tried.value && !replyText.value.trim() ? t('reviews.replyRequired') : null,
}))

async function sendReply() {
  tried.value = true
  if (sending.value || replyErrors.value.name || replyErrors.value.text) return
  sending.value = true
  error.value = null
  try {
    await postReply(props.review.id, {
      name: replyName.value,
      text: replyText.value,
      imageIds: replyImages.value.map((image) => image.id),
    })
    replyText.value = ''
    replyImages.value = []
    tried.value = false
    replying.value = false
    emit('changed')
  } catch (e) {
    error.value = t('reviews.failed', { message: e instanceof Error ? e.message : '' })
  } finally {
    sending.value = false
  }
}

const canDelete = (post: { author: { mine: boolean } }) => props.owner || post.author.mine

async function remove(kind: 'review' | 'reply', id: number) {
  await (kind === 'review' ? deleteReview(id) : deleteReply(id)).catch(() => {})
  emit('changed')
}
</script>

<template>
  <li class="card panel review" :data-title="review.name">
    <header class="review__head">
      <PostAuthor :name="review.name" :author="review.author" :is-owner="review.isOwner" />
      <KeefRating :value="review.rating" :size="26" />
    </header>
    <p class="review__text">{{ review.text }}</p>
    <ImageGrid :images="review.images" />

    <footer class="review__foot">
      <time class="review__date" :datetime="review.createdAt">{{ date(review.createdAt) }}</time>
      <span class="review__actions">
        <button
          type="button"
          class="vote"
          :class="{ 'vote--on': votes.mine === 1 }"
          :aria-label="$t('reviews.like')"
          :aria-pressed="votes.mine === 1"
          @click="castVote(1)"
        >
          👍 {{ votes.likes }}
        </button>
        <button
          type="button"
          class="vote"
          :class="{ 'vote--on': votes.mine === -1 }"
          :aria-label="$t('reviews.dislike')"
          :aria-pressed="votes.mine === -1"
          @click="castVote(-1)"
        >
          👎 {{ votes.dislikes }}
        </button>
        <button type="button" class="link" @click="replying = !replying">{{ $t('reviews.reply') }}</button>
        <button
          v-if="canDelete(review)"
          type="button"
          class="link link--danger"
          @click="remove('review', review.id)"
        >
          {{ $t('reviews.delete') }}
        </button>
      </span>
    </footer>

    <ul v-if="review.replies.length" class="replies">
      <li v-for="reply in review.replies" :key="reply.id" class="reply" :class="{ 'reply--owner': reply.isOwner }">
        <header class="reply__head">
          <PostAuthor :name="reply.name" :author="reply.author" :is-owner="reply.isOwner" />
          <time class="review__date" :datetime="reply.createdAt">{{ date(reply.createdAt) }}</time>
          <button
            v-if="canDelete(reply)"
            type="button"
            class="link link--danger"
            @click="remove('reply', reply.id)"
          >
            {{ $t('reviews.delete') }}
          </button>
        </header>
        <p class="review__text">{{ reply.text }}</p>
        <ImageGrid :images="reply.images" />
      </li>
    </ul>

    <div v-if="replying" class="reply-form">
      <input
        v-if="!signedIn"
        v-model="replyName"
        class="input"
        :class="{ 'input--invalid': replyErrors.name }"
        :aria-invalid="Boolean(replyErrors.name)"
        maxlength="40"
        :placeholder="$t('reviews.namePlaceholder')"
        :aria-label="$t('reviews.name')"
      />
      <span v-if="replyErrors.name" class="field__error">{{ replyErrors.name }}</span>
      <textarea
        v-model="replyText"
        class="input input--area"
        :class="{ 'input--invalid': replyErrors.text }"
        :aria-invalid="Boolean(replyErrors.text)"
        rows="2"
        maxlength="1000"
        :placeholder="$t('reviews.replyField')"
        :aria-label="$t('reviews.replyField')"
      />
      <span v-if="replyErrors.text" class="field__error">{{ replyErrors.text }}</span>
      <ImagePicker v-if="uploads" v-model="replyImages" />
      <div class="reply-form__actions">
        <BaseButton variant="primary" :disabled="sending" @click="sendReply">
          {{ sending ? $t('reviews.sending') : $t('reviews.sendReply') }}
        </BaseButton>
        <p v-if="error" class="status status--error">{{ error }}</p>
      </div>
    </div>
  </li>
</template>

<style scoped>
.review {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review__head,
.review__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.review__text {
  color: var(--color-text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.review__date {
  color: var(--color-text-muted);
  font-size: 12px;
}

.review__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.vote {
  padding: 3px 9px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface-alt);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
}

.vote--on {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.link {
  padding: 0 4px;
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
}

.link--danger {
  color: var(--color-danger);
}

.replies {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 0 0 12px;
  border-left: 2px solid var(--color-border);
  list-style: none;
}

.reply {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reply__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.reply--owner {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);
}

.reply-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-form__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.input {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
  color: var(--color-text);
  font-size: 14px;
}

.input:focus {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-accent-soft);
}

.input--invalid,
.input--invalid:focus {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 20%, transparent);
}

.field__error {
  margin-top: -4px;
  color: var(--color-danger);
  font-size: 13px;
}

.input--area {
  min-height: 60px;
  resize: vertical;
}
</style>
