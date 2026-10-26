<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// The sign-in line above the review form (optional: anonymous posting stays). Signed out, a
// button that opens the sign-in bot in Telegram (the same as the header's); signed in, who the
// review will be signed as.
const auth = useAuthStore()
const { user, owner, available, link, error } = storeToRefs(auth)
</script>

<template>
  <div v-if="user" class="me">
    <img v-if="user.photoUrl" class="me__avatar" :src="user.photoUrl" alt="" />
    <span class="me__text">
      {{ $t('reviews.signedInAs') }} <strong>{{ user.name }}</strong>
      <span v-if="owner" class="badge">✓ {{ $t('reviews.owner') }}</span>
    </span>
    <button type="button" class="me__logout" @click="auth.signOut()">
      {{ $t('reviews.signOut') }}
    </button>
  </div>
  <div v-else-if="available" class="login">
    <button type="button" class="login__btn" @click="auth.signIn()">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21.5 3.5 2.8 10.7c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.3.9 1.4 1.1 2 .4l2.6-2.6 4.8 3.5c.7.5 1.7.1 1.9-.8l3-14.7c.2-1.1-.9-2-2.1-1.6Z"
        />
      </svg>
      {{ $t('auth.signIn') }}
    </button>
    <p v-if="link" class="login__hint">
      {{ $t('auth.waiting') }}
      <a :href="link" target="_blank" rel="noopener">{{ $t('auth.openBot') }}</a>
    </p>
    <p v-else class="login__hint">{{ $t('reviews.signInHint') }}</p>
    <p v-if="error" class="status status--error">{{ error }}</p>
  </div>
</template>

<style scoped>
.me {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.me__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.me__text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.me__text strong {
  color: var(--color-text);
}

.me__logout {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent);
  font-size: 13px;
  cursor: pointer;
}

.badge {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 11px;
  font-weight: 700;
}

.login {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

/* Telegram's own blue, like its login button. */
.login__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  border: none;
  border-radius: 6px;
  background: #2aabee;
  color: #fff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.login__btn:hover {
  background: #229ed9;
}

.login__btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.login__hint {
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
