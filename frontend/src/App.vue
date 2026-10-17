<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import DanceFloor from '@/components/dancers/DanceFloor.vue'
import IpodPlayer from '@/components/ipod/IpodPlayer.vue'
import FlPlaylist from '@/components/themes/FlPlaylist.vue'
import { useThemeStore } from '@/stores/theme'
import { storeToRefs } from 'pinia'
import { computed, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { theme } = storeToRefs(useThemeStore())
const route = useRoute()
const { t } = useI18n()

// Follows both the route and the language.
const pageTitle = computed(() => (route.meta.titleKey ? t(route.meta.titleKey) : null))
watchEffect(() => {
  document.title = pageTitle.value ? `${pageTitle.value} · NER9` : 'NER9'
})
</script>

<template>
  <FlPlaylist v-if="theme === 'fl'" />
  <div class="layout">
    <AppHeader />
    <!-- Windows 98 and FL Studio draw the page as a window titled after the route. -->
    <main
      class="layout__main"
      :data-title="`${pageTitle ?? 'NER9'} — Internet Explorer`"
      :data-fl-title="`Playlist – Arrangement › ${pageTitle ?? 'NER9'}`"
    >
      <RouterView />
    </main>
    <AppFooter />
    <DanceFloor />
    <IpodPlayer />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout__main {
  flex: 1;
}
</style>
