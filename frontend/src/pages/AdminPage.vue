<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/http'
import { fetchOwnerProjects, type OwnerProject } from '@/api/owner'

// The owner's cheat sheet: every deployed project with its addresses. The list comes from the
// backend and only for the owner's session, so it never sits in the public bundle.
const { owner } = storeToRefs(useAuthStore())

const projects = ref<OwnerProject[]>([])
const state = ref<'loading' | 'ready' | 'forbidden' | 'error'>('loading')
const error = ref('')

async function load() {
  state.value = 'loading'
  try {
    projects.value = await fetchOwnerProjects()
    state.value = 'ready'
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) state.value = 'forbidden'
    else {
      error.value = e instanceof Error ? e.message : String(e)
      state.value = 'error'
    }
  }
}

// Signing in (or out) on this page changes what the backend will answer.
watch(owner, () => void load(), { immediate: true })

const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')
</script>

<template>
  <div class="container page">
    <header>
      <p class="eyebrow">{{ $t('admin.eyebrow') }}</p>
      <h1 class="page-title">{{ $t('admin.title') }}</h1>
      <p v-if="state === 'ready'" class="note">{{ $t('admin.note') }}</p>
    </header>

    <p v-if="state === 'loading'" class="status">{{ $t('admin.loading') }}</p>
    <p v-else-if="state === 'forbidden'" class="card panel" :data-title="$t('admin.title')">
      {{ $t('admin.forbidden') }}
    </p>
    <p v-else-if="state === 'error'" class="card panel" role="alert">{{ error }}</p>

    <ul v-else class="grid">
      <li v-for="project in projects" :key="project.name" class="card panel item" :data-title="project.name">
        <div class="item__head">
          <h2 class="item__name">{{ project.name }}</h2>
          <span class="item__status" :class="`item__status--${project.status}`">
            {{ $t(`admin.status.${project.status}`) }}
          </span>
        </div>
        <p class="item__summary">{{ project.summary }}</p>
        <ul class="item__links">
          <li v-for="link in project.links" :key="link.url">
            <a :href="link.url" target="_blank" rel="noopener">
              <span class="item__label">{{ link.label }}</span>
              <span class="item__host">{{ host(link.url) }}</span>
            </a>
          </li>
        </ul>
        <p class="item__deploy">{{ $t('admin.deploy') }}: {{ project.deploy }}</p>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.note {
  color: var(--color-text-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: 16px;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.item__name {
  font-size: 1.2rem;
}

.item__status {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
  font-family: var(--font-label);
  font-size: 12px;
  font-weight: 600;
  text-transform: var(--label-transform);

  &--live {
    background: var(--color-accent-soft);
    color: var(--color-accent);
  }
}

.item__summary {
  color: var(--color-text);
}

.item__links {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  list-style: none;

  a {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    color: var(--color-accent);
    text-decoration: none;

    &:hover .item__host {
      text-decoration: underline;
    }
  }
}

.item__label {
  min-width: 9em;
  color: var(--color-text);
}

.item__host {
  overflow-wrap: anywhere;
}

.item__deploy {
  margin-top: auto;
  color: var(--color-text-muted);
  font-size: 13px;
}
</style>
