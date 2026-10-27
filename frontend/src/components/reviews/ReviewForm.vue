<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError } from '@/api/http'
import { postReview } from '@/api/reviews'
import ImagePicker from '@/components/reviews/ImagePicker.vue'
import KeefRating from '@/components/reviews/KeefRating.vue'
import TelegramLogin from '@/components/reviews/TelegramLogin.vue'
import { useAuthStore } from '@/stores/auth'
import type { ReviewImage, ReviewProject } from '@/types/review'

// The comment form at the bottom of a project's comments sheet: one line with a send button, like
// Instagram's; focusing it unfolds the rest (name, rating, image, the example). The text field is labelled "SQL injection field": a real
// comment is published at once, an injection attempt gets the visitor's IP banned (backend
// routes/reviews) and the API client sends them to banned.html. Signed in with Telegram, the
// account's name is used instead of the name field.
const props = defineProps<{ project: ReviewProject; uploads: boolean }>()
const emit = defineEmits<{ posted: [] }>()

const EXAMPLE_INJECTION = "'; DROP TABLE reviews; --"

const { t } = useI18n()
const auth = useAuthStore()

const name = ref('')
const text = ref('')
const rating = ref(5)
const images = ref<ReviewImage[]>([])
const sending = ref(false)
const message = ref<{ kind: 'success' | 'error'; text: string } | null>(null)
// The extra fields show once the visitor starts writing.
const expanded = ref(false)
const field = ref<HTMLTextAreaElement>()

// The text field grows with its text, up to a few lines, then scrolls.
function fit() {
  const el = field.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 140)}px`
}

async function pasteExample() {
  text.value = EXAMPLE_INJECTION
  await nextTick()
  fit()
}

// Empty fields are pointed out on send (and cleared as soon as they're filled in).
const tried = ref(false)
const errors = computed(() => ({
  // Signed in, the Telegram name is used.
  name: tried.value && !auth.user && !name.value.trim() ? t('reviews.nameRequired') : null,
  text: tried.value && !text.value.trim() ? t('reviews.textRequired') : null,
}))

async function send() {
  tried.value = true
  if (sending.value || errors.value.name || errors.value.text) return
  sending.value = true
  message.value = null
  try {
    await postReview({
      project: props.project,
      name: name.value,
      text: text.value,
      rating: rating.value,
      imageIds: images.value.map((image) => image.id),
    })
    text.value = ''
    images.value = []
    tried.value = false
    expanded.value = false
    await nextTick()
    fit()
    message.value = { kind: 'success', text: t('reviews.thanks') }
    emit('posted')
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0
    message.value = {
      kind: 'error',
      text:
        status === 429
          ? t('reviews.tooMany')
          : t('reviews.failed', { message: error instanceof Error ? error.message : '' }),
    }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <form class="composer" @submit.prevent="send">
    <div v-if="expanded" class="composer__extra">
      <TelegramLogin />
      <input
        v-if="!auth.user"
        v-model="name"
        class="input"
        :class="{ 'input--invalid': errors.name }"
        :aria-invalid="Boolean(errors.name)"
        :aria-label="$t('reviews.name')"
        maxlength="40"
        :placeholder="$t('reviews.namePlaceholder')"
        autocomplete="nickname"
      />
      <span v-if="errors.name" class="field__error">{{ errors.name }}</span>
      <div class="composer__rating">
        <span class="field__label">{{ $t('reviews.rating') }}</span>
        <KeefRating v-model:value="rating" :size="28" editable />
      </div>
      <button type="button" class="example" @click="pasteExample">
        <code>{{ EXAMPLE_INJECTION }}</code> ← {{ $t('reviews.example') }}
      </button>
      <ImagePicker v-if="uploads" v-model="images" />
    </div>

    <div class="composer__row">
      <img v-if="auth.user?.photoUrl" class="composer__avatar" :src="auth.user.photoUrl" alt="" />
      <textarea
        ref="field"
        v-model="text"
        class="input composer__text"
        :class="{ 'input--invalid': errors.text }"
        :aria-invalid="Boolean(errors.text)"
        :aria-label="$t('reviews.field')"
        rows="1"
        maxlength="1000"
        :placeholder="$t('reviews.field')"
        @focus="expanded = true"
        @input="fit"
      />
      <button type="submit" class="composer__send" :disabled="sending || !text.trim()">
        {{ sending ? $t('reviews.sending') : $t('reviews.submit') }}
      </button>
    </div>
    <span v-if="errors.text" class="field__error">{{ errors.text }}</span>
    <p v-if="message" class="status" :class="`status--${message.kind}`">{{ message.text }}</p>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: var(--color-surface);
}

.composer__extra {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 40dvh;
  overflow-y: auto;
}

/* A smaller sign-in button: here it's an option, not the point. */
.composer__extra :deep(.login__btn) {
  padding: 6px 12px;
  font-size: 14px;
}

.composer__rating {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
}

.composer__row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.composer__avatar {
  flex: none;
  width: 32px;
  height: 32px;
  margin-bottom: 4px;
  border-radius: 50%;
  object-fit: cover;
}

.composer__text {
  flex: 1;
  min-width: 0;
  resize: none;
  border-radius: 20px;
  line-height: 1.35;
}

.composer__send {
  flex: none;
  padding: 10px 4px;
  border: none;
  background: none;
  color: var(--color-accent);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.composer__send:disabled {
  opacity: 0.45;
  cursor: default;
}

.field__label {
  color: var(--color-text-muted);
  font-family: var(--font-label);
  font-size: 12px;
  font-weight: 600;
  text-transform: var(--label-transform);
}

.input {
  width: 100%;
  padding: 9px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
  color: var(--color-text);
  /* 16px keeps iOS from zooming into the field. */
  font-size: 16px;
}

.composer__text.input {
  border-radius: 20px;
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
  color: var(--color-danger);
  font-size: 13px;
}

.example {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.example code {
  color: var(--color-danger);
}

.example:hover {
  color: var(--color-accent);
}
</style>
