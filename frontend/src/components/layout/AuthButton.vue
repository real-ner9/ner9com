<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Header sign-in: a Telegram button that opens the sign-in bot in Telegram; once signed in, the
// account's photo, which opens a small card with the name and "Sign out". Hidden when sign-in
// isn't configured on the backend.
const auth = useAuthStore()
const { user, owner, available, link, error } = storeToRefs(auth)

const open = ref(false)
// A photo that fails to load falls back to the name's first letter.
const photoFailed = ref(false)
watch(() => user.value?.photoUrl, () => (photoFailed.value = false))

// Without a photo (hidden by the account's privacy settings): the first letter of the name or
// @username, skipping emoji and symbols; none at all leaves the Telegram plane.
const initial = computed(() => {
  const text = `${user.value?.name ?? ''} ${user.value?.username ?? ''}`
  return text.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? null
})
const root = ref<HTMLElement | null>(null)

function onClick() {
  if (user.value) open.value = !open.value
  else void auth.signIn()
}

async function signOut() {
  open.value = false
  await auth.signOut()
}

const onOutside = (event: PointerEvent) => {
  if (!root.value?.contains(event.target as Node)) open.value = false
}
const onKey = (event: KeyboardEvent) => event.key === 'Escape' && (open.value = false)

onMounted(() => {
  void auth.load()
  document.addEventListener('pointerdown', onOutside, { capture: true })
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside, { capture: true })
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="available" ref="root" class="account">
    <button
      type="button"
      class="account__btn icon-btn"
      :class="{ 'account__btn--in': user }"
      :aria-expanded="user ? open : undefined"
      :title="user ? user.name : $t('auth.signIn')"
      @click="onClick"
    >
      <img
        v-if="user?.photoUrl && !photoFailed"
        class="account__photo"
        :src="user.photoUrl"
        alt=""
        @error="photoFailed = true"
      />
      <span v-else-if="user && initial" class="account__initial">{{ initial }}</span>
      <svg v-else class="account__plane" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.5 3.5 2.8 10.7c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.3.9 1.4 1.1 2 .4l2.6-2.6 4.8 3.5c.7.5 1.7.1 1.9-.8l3-14.7c.2-1.1-.9-2-2.1-1.6Z" />
        <path d="m7.5 14 10-7-7.6 8.5" />
      </svg>
      <span class="visually-hidden">{{ user ? $t('auth.account') : $t('auth.signIn') }}</span>
    </button>

    <div v-if="user && open" class="account__card">
      <strong class="account__name">{{ user.name }}</strong>
      <a
        v-if="user.username"
        class="account__username"
        :href="`https://t.me/${user.username}`"
        target="_blank"
        rel="noopener"
        >@{{ user.username }}</a
      >
      <span v-if="owner" class="account__badge">✓ {{ $t('reviews.owner') }}</span>
      <RouterLink v-if="owner" to="/admin" class="account__username" @click="open = false">{{
        $t('nav.admin')
      }}</RouterLink>
      <button type="button" class="account__logout" @click="signOut">
        {{ $t('auth.signOut') }}
      </button>
    </div>

    <div v-if="link && !user" class="account__card">
      <span>{{ $t('auth.waiting') }}</span>
      <a class="account__username" :href="link" target="_blank" rel="noopener">{{
        $t('auth.openBot')
      }}</a>
      <button type="button" class="account__logout" @click="auth.stopWaiting()">
        {{ $t('auth.cancel') }}
      </button>
    </div>
    <p v-else-if="error && !user" class="account__card account__card--error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.account {
  position: relative;
}

.account__btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s;

  &:hover {
    color: var(--color-accent);
  }

  &--in {
    border-color: var(--color-accent);
  }
}

.account__plane {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linejoin: round;
}

// Pinned to the whole circle: as a grid item a percentage size collapsed to a sliver.
.account__photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.account__initial {
  font-size: 16px;
  line-height: 1;
  color: var(--color-accent);
  font-weight: 700;
}

.account__card {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 190px;
  max-width: min(260px, calc(100vw - 32px));
  padding: 12px 14px;
  border: 1px solid var(--card-border, var(--color-border));
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
  color: var(--color-text);
  font-size: 14px;

  &--error {
    color: var(--color-danger);
  }
}

.account__username {
  color: var(--color-accent);
  font-size: 13px;
}

.account__badge {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 11px;
  font-weight: 700;
}

.account__logout {
  padding: 0;
  border: none;
  background: none;
  color: var(--color-accent);
  font: inherit;
  cursor: pointer;
}
</style>
