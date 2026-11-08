<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import TelegramLogin from '@/components/reviews/TelegramLogin.vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/http'
import type { Locale } from '@/i18n'
import {
  deleteAccount,
  fetchMinecraft,
  forgetAddresses,
  saveNickname,
  type MinecraftState,
} from '@/api/minecraft'

// Accounts for the owner's Minecraft server (backend routes/minecraft): a signed-in visitor claims
// one nickname, and the server's mod lets it in only after "It's me" in the Telegram bot. Below,
// how to join with plain TLauncher.
const { t, locale, d } = useI18n()
const { user } = storeToRefs(useAuthStore())

const NICKNAME = /^[A-Za-z0-9_]{3,16}$/

const data = ref<MinecraftState | null>(null)
const error = ref('')
const editing = ref(false)
const nickname = ref('')
const busy = ref(false)
const copied = ref(false)

const server = computed(() => data.value?.server)
const account = computed(() => data.value?.account ?? null)
const nicknameValid = computed(() => NICKNAME.test(nickname.value))

async function load() {
  try {
    data.value = await fetchMinecraft()
    error.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}

// Signing in (or out) on this page changes the account.
watch(user, () => void load(), { immediate: true })

function startEditing() {
  nickname.value = account.value?.nickname ?? ''
  error.value = ''
  editing.value = true
}

async function run(action: () => Promise<{ account: MinecraftState['account'] }>) {
  if (!data.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    data.value = { ...data.value, account: (await action()).account }
    editing.value = false
  } catch (e) {
    error.value =
      e instanceof ApiError && e.status === 409
        ? t('minecraft.taken')
        : e instanceof Error
          ? e.message
          : String(e)
  } finally {
    busy.value = false
  }
}

const save = () => {
  if (nicknameValid.value) void run(() => saveNickname(nickname.value, locale.value as Locale))
}
const forget = () => void run(forgetAddresses)
const remove = () => {
  if (window.confirm(t('minecraft.removeConfirm'))) void run(deleteAccount)
}

async function copyAddress() {
  if (!server.value) return
  try {
    await navigator.clipboard.writeText(server.value.address)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // No clipboard (insecure context): the address is on screen anyway.
  }
}
</script>

<template>
  <div class="container page">
    <header>
      <p class="eyebrow">{{ $t('minecraft.eyebrow') }}</p>
      <h1 class="page-title">{{ $t('minecraft.title') }}</h1>
      <p v-if="server" class="lead">
        {{ $t('minecraft.lead', { version: server.version }) }}
      </p>
    </header>

    <p v-if="!data && !error" class="status">{{ $t('minecraft.loading') }}</p>
    <p v-else-if="!data" class="card panel" role="alert">{{ error }}</p>

    <div v-else class="grid">
      <section class="card panel block" :data-title="$t('minecraft.account')">
        <h2 class="block__title">{{ $t('minecraft.account') }}</h2>

        <TelegramLogin v-if="!user" :hint="$t('minecraft.signInHint')" />

        <form v-else-if="!account || editing" class="form" @submit.prevent="save">
          <label class="form__label" for="mc-nickname">{{ $t('minecraft.nickname') }}</label>
          <input
            id="mc-nickname"
            v-model.trim="nickname"
            class="form__input"
            maxlength="16"
            autocomplete="off"
            spellcheck="false"
          />
          <p class="hint">{{ $t('minecraft.nicknameHint') }}</p>
          <p v-if="account" class="hint">{{ $t('minecraft.renameHint') }}</p>
          <div class="actions">
            <button type="submit" class="action action--primary" :disabled="!nicknameValid || busy">
              {{ account ? $t('minecraft.save') : $t('minecraft.claim') }}
            </button>
            <button v-if="account" type="button" class="action" @click="editing = false">
              {{ $t('minecraft.cancel') }}
            </button>
          </div>
        </form>

        <template v-else>
          <p class="nickname">{{ account.nickname }}</p>
          <h3 class="block__subtitle">{{ $t('minecraft.addresses') }}</h3>
          <ul v-if="account.addresses.length" class="addresses">
            <li v-for="address in account.addresses" :key="address.ip">
              <code>{{ address.ip }}</code>
              <span class="hint">{{
                $t('minecraft.lastUsed', { date: d(new Date(address.lastUsedAt)) })
              }}</span>
            </li>
          </ul>
          <p v-else class="hint">{{ $t('minecraft.noAddresses') }}</p>
          <p v-if="account.addresses.length" class="hint">
            {{ $t('minecraft.addressesHint', { days: server!.trustDays }) }}
          </p>
          <div class="actions">
            <button type="button" class="action" @click="startEditing">
              {{ $t('minecraft.rename') }}
            </button>
            <button
              v-if="account.addresses.length"
              type="button"
              class="action"
              :disabled="busy"
              @click="forget"
            >
              {{ $t('minecraft.forget') }}
            </button>
            <button type="button" class="action action--danger" :disabled="busy" @click="remove">
              {{ $t('minecraft.remove') }}
            </button>
          </div>
        </template>

        <p v-if="error" class="status status--error" role="alert">{{ error }}</p>
      </section>

      <section class="card panel block" :data-title="$t('minecraft.install')">
        <h2 class="block__title">{{ $t('minecraft.install') }}</h2>
        <ol class="steps">
          <li>
            {{ $t('minecraft.step1') }}
            <a href="https://tlauncher.org/" target="_blank" rel="noopener">tlauncher.org</a>
          </li>
          <li>
            {{ $t('minecraft.step2') }}
            <code class="pick">Release {{ server!.version }}</code>
            <p class="hint">{{ $t('minecraft.versionHint', { version: server!.version }) }}</p>
          </li>
          <li>{{ $t('minecraft.step3') }}</li>
        </ol>

        <div class="address">
          <span class="hint">{{ $t('minecraft.address') }}</span>
          <code>{{ server!.address }}</code>
          <button type="button" class="action" @click="copyAddress">
            {{ copied ? $t('minecraft.copied') : $t('minecraft.copy') }}
          </button>
        </div>
      </section>

      <section class="card panel block" :data-title="$t('minecraft.how')">
        <h2 class="block__title">{{ $t('minecraft.how') }}</h2>
        <p>{{ $t('minecraft.howText') }}</p>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.lead {
  max-width: 60ch;
  color: var(--color-text);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  align-items: start;
  gap: 16px;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block__title {
  font-size: 1.2rem;
}

.block__subtitle {
  margin-top: 4px;
  font-size: 1rem;
}

.hint {
  color: var(--color-text-muted);
  font-size: 13px;
}

.nickname {
  font-family: var(--font-label);
  font-size: 1.4rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form__label {
  font-weight: 600;
}

.form__input {
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;

  &:focus {
    border-color: var(--color-accent);
    outline: none;
  }
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action {
  padding: 7px 14px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 14px;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  &--primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-on-accent);
  }

  &--danger {
    color: var(--color-danger, var(--color-text-muted));
  }
}

.addresses {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 1.2em;
}

.addresses li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 1.2em;

  a {
    color: var(--color-accent);
  }
}

.pick {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: 8px 0 4px;
  padding: 6px 12px;
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  color: var(--color-accent);
  font-size: 1.05rem;
  font-weight: 700;
}

.address {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;

  code {
    font-size: 1.05rem;
    font-weight: 700;
  }
}

code {
  overflow-wrap: anywhere;
}
</style>
