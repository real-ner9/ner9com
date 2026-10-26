<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError } from '@/api/http'
import { postReview } from '@/api/reviews'
import ImagePicker from '@/components/reviews/ImagePicker.vue'
import KeefRating from '@/components/reviews/KeefRating.vue'
import TelegramLogin from '@/components/reviews/TelegramLogin.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'
import type { ReviewImage, ReviewProject } from '@/types/review'

// The comment form under a project. The text field is labelled "SQL injection field": a real
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
  <section class="card panel form" :data-title="$t('reviews.formTitle')">
    <TelegramLogin />

    <label v-if="!auth.user" class="field">
      <span class="field__label">{{ $t('reviews.name') }}</span>
      <input
        v-model="name"
        class="input"
        :class="{ 'input--invalid': errors.name }"
        :aria-invalid="Boolean(errors.name)"
        maxlength="40"
        :placeholder="$t('reviews.namePlaceholder')"
        autocomplete="nickname"
      />
      <span v-if="errors.name" class="field__error">{{ errors.name }}</span>
    </label>

    <div class="field">
      <span class="field__label">{{ $t('reviews.rating') }}</span>
      <KeefRating v-model:value="rating" :size="46" editable />
    </div>

    <label class="field">
      <span class="field__label">{{ $t('reviews.field') }}</span>
      <textarea
        v-model="text"
        class="input input--area"
        :class="{ 'input--invalid': errors.text }"
        :aria-invalid="Boolean(errors.text)"
        rows="4"
        maxlength="1000"
        :placeholder="$t('reviews.fieldPlaceholder')"
      />
      <span v-if="errors.text" class="field__error">{{ errors.text }}</span>
    </label>
    <button type="button" class="example" @click="text = EXAMPLE_INJECTION">
      <code>{{ EXAMPLE_INJECTION }}</code> ← {{ $t('reviews.example') }}
    </button>

    <ImagePicker v-if="uploads" v-model="images" />

    <div class="form__actions">
      <BaseButton variant="primary" :disabled="sending" @click="send">
        {{ sending ? $t('reviews.sending') : $t('reviews.submit') }}
      </BaseButton>
      <p v-if="message" class="status" :class="`status--${message.kind}`">{{ message.text }}</p>
    </div>
  </section>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 640px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-alt);
  color: var(--color-text);
  font-size: 15px;
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

.input--area {
  resize: vertical;
  min-height: 110px;
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

.form__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
</style>
