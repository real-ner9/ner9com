<script setup lang="ts">
import { t } from '@/i18n'
import { computed, provide, ref, type Component } from 'vue'
import { storeToRefs } from 'pinia'
import AlbumView from '@/components/ipod/views/AlbumView.vue'
import AlbumsView from '@/components/ipod/views/AlbumsView.vue'
import CoverFlowView from '@/components/ipod/views/CoverFlowView.vue'
import MenuView from '@/components/ipod/views/MenuView.vue'
import NowPlayingView from '@/components/ipod/views/NowPlayingView.vue'
import { useLibraryStore } from '@/stores/library'
import { usePlayerStore } from '@/stores/player'
import { IPOD_NAVIGATOR, type IpodView, type IpodViewHandle } from '@/types/ipod'

/**
 * The iPod display: title bar plus a stack of views. Entering a menu slides left, going back
 * slides right. `compact` shows the mini "now playing" row used while the sheet is collapsed;
 * `miniOpacity` fades it in as the sheet is dragged down, so the list never shows through.
 */
defineProps<{ compact: boolean; miniOpacity: number }>()
const emit = defineEmits<{ expand: [] }>()

const player = usePlayerStore()
const library = useLibraryStore()
const { currentTrack, isPlaying, isLoading } = storeToRefs(player)

const VIEWS: Record<IpodView['name'], Component> = {
  menu: MenuView,
  coverflow: CoverFlowView,
  albums: AlbumsView,
  album: AlbumView,
  nowPlaying: NowPlayingView,
}

// Opens straight into Cover Flow; MENU goes up to the main menu.
const stack = ref<IpodView[]>([{ name: 'menu' }, { name: 'coverflow' }])
const transition = ref('ipod-push')
const view = computed(() => stack.value[stack.value.length - 1])
const viewRef = ref<IpodViewHandle | null>(null)

const title = computed(() => {
  switch (view.value.name) {
    case 'menu':
      return 'iPod'
    case 'coverflow':
      return 'Cover Flow'
    case 'albums':
      return t('ipod.albums')
    case 'album':
      return library.albumById(view.value.albumId)?.name ?? t('ipod.album')
    case 'nowPlaying':
      return t('ipod.nowPlaying')
    default:
      return 'iPod'
  }
})

// The album view animates itself (unfolding from Cover Flow), so it skips the slide.
const transitionFor = (from: IpodView, to: IpodView, dir: 'push' | 'pop') =>
  from.name === 'album' || to.name === 'album' ? 'ipod-none' : `ipod-${dir}`

function push(next: IpodView) {
  transition.value = transitionFor(view.value, next, 'push')
  stack.value = [...stack.value, next]
}

let leaving = false
async function back(): Promise<boolean> {
  if (stack.value.length <= 1 || leaving) return false
  leaving = true
  try {
    await viewRef.value?.beforeLeave?.()
    transition.value = transitionFor(view.value, stack.value[stack.value.length - 2], 'pop')
    stack.value = stack.value.slice(0, -1)
    return true
  } finally {
    leaving = false
  }
}

provide(IPOD_NAVIGATOR, { push, back })

// Swipe right anywhere on the screen = back, except in views that use horizontal swipes.
let swipe: { x: number; y: number } | null = null
function onPointerDown(event: PointerEvent) {
  const ownSwipe = (event.target as HTMLElement).closest('[data-own-swipe]')
  swipe = ownSwipe ? null : { x: event.clientX, y: event.clientY }
}
function onPointerUp(event: PointerEvent) {
  if (!swipe) return
  const dx = event.clientX - swipe.x
  const dy = event.clientY - swipe.y
  swipe = null
  if (dx > 50 && Math.abs(dy) < 40) void back()
}

defineExpose({
  scroll: (delta: number) => viewRef.value?.scroll(delta),
  select: () => viewRef.value?.select(),
  back,
})
</script>

<template>
  <div class="screen">
    <header class="screen__bar">
      <span class="screen__state" aria-hidden="true">
        <template v-if="currentTrack">{{ isPlaying ? '▶' : '❚❚' }}</template>
      </span>
      <span class="screen__title">{{ title }}</span>
      <span class="screen__battery" aria-hidden="true"><span /></span>
    </header>

    <div class="screen__body" @pointerdown="onPointerDown" @pointerup="onPointerUp">
      <Transition :name="transition">
        <component
          :is="VIEWS[view.name]"
          :key="stack.length + view.name"
          ref="viewRef"
          class="screen__view"
          v-bind="view.name === 'album' ? { albumId: view.albumId } : {}"
        />
      </Transition>

      <!-- Mini player shown while the sheet is collapsed; tapping it opens the iPod. -->
      <div
        class="screen__mini"
        :class="{ 'screen__mini--shown': compact }"
        :style="{ opacity: miniOpacity }"
        :aria-hidden="!compact"
        @click="emit('expand')"
      >
          <div class="screen__mini-row">
            <img
              v-if="currentTrack?.coverUrl"
              class="screen__mini-cover"
              :src="currentTrack.coverUrl"
              alt=""
            />
            <span v-else class="screen__mini-cover screen__mini-cover--empty">♪</span>
            <span class="screen__mini-text">
              <span class="screen__mini-title">{{ currentTrack?.title ?? $t('ipod.music') }}</span>
              <span class="screen__mini-sub">
                {{
                  currentTrack
                    ? (currentTrack.artist ?? $t('ipod.unknownArtist'))
                    : $t('ipod.openToPick')
                }}
              </span>
            </span>
            <button
              v-if="currentTrack"
              type="button"
              class="screen__mini-play"
              data-no-drag
              :aria-label="isPlaying ? $t('ipod.pause') : $t('ipod.play')"
              @click.stop="player.toggle"
            >
              <span v-if="isLoading && !isPlaying" class="screen__spinner" />
              <template v-else>{{ isPlaying ? '❚❚' : '▶' }}</template>
            </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.screen {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #fff;
  font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  user-select: none;
}

.screen__bar {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: 24px 1fr 24px;
  align-items: center;
  height: max(18px, calc(var(--ipod-w) * 0.062));
  padding: 0 5px;
  border-bottom: 1px solid #8e9198;
  background: linear-gradient(180deg, #fdfdfd 0%, #e6e7ea 50%, #d3d5d9 51%, #c9cbd0 100%);
  color: #000;
  font-weight: 700;
  font-size: max(10px, calc(var(--ipod-w) * 0.036));
}

.screen__state {
  color: #2a62c0;
  font-size: 0.85em;
}

.screen__title {
  overflow: hidden;
  text-align: center;
  white-space: nowrap;
  text-overflow: ellipsis;
}

// Battery: outlined cell with a green charge, like the 6th gen status bar.
.screen__battery {
  position: relative;
  justify-self: end;
  width: 20px;
  height: 9px;
  padding: 1px;
  border: 1px solid #4b4f58;
  border-radius: 2px;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    right: -3px;
    width: 2px;
    height: 3px;
    background: #4b4f58;
  }

  span {
    display: block;
    width: 80%;
    height: 100%;
    background: linear-gradient(180deg, #b8f08a, #4caf28);
  }
}

.screen__body {
  position: relative;
  flex: 1;
  overflow: hidden;
  container-type: size;
}

.screen__view {
  position: absolute;
  inset: 0;
}

// Covers the whole screen so nothing of the view behind peeks out below the row
// (on iPhones the safe area under the sheet shows a bit more of the device).
.screen__mini {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: linear-gradient(180deg, #fff 0%, #eef0f3 100%);
  cursor: pointer;
  pointer-events: none;
  // Fades out as the iPod opens. Collapsing covers the list at once (no transition), otherwise
  // the tracks stay visible for a moment while the sheet slides down.
  transition: opacity 0.2s;

  &--shown {
    pointer-events: auto;
    transition: none;
  }
}

.screen__mini-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: calc(var(--ipod-w) * 0.15);
  padding: 0 8px;
  border-bottom: 1px solid #d5d7db;
}

.screen__mini-cover {
  width: calc(var(--ipod-w) * 0.13);
  height: calc(var(--ipod-w) * 0.13);
  flex-shrink: 0;
  object-fit: cover;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);

  &--empty {
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #8d939e, #4b4f58);
    color: #fff;
  }
}

.screen__mini-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  color: #000;
  line-height: 1.2;
}

.screen__mini-title,
.screen__mini-sub {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.screen__mini-title {
  font-weight: 700;
  font-size: 13px;
}

.screen__mini-sub {
  color: #4b4f58;
  font-size: 11px;
}

.screen__mini-play {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid #9aa0aa;
  border-radius: 50%;
  background: linear-gradient(180deg, #fdfdfd, #d9dbdf);
  color: #2b2e34;
  font-size: 12px;
  cursor: pointer;
}

.screen__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ipod-spin 0.8s linear infinite;
}

@keyframes ipod-spin {
  to {
    transform: rotate(360deg);
  }
}

// iPod menu transitions: new screens slide in from the right, going back slides them out.
.ipod-push-enter-active,
.ipod-push-leave-active,
.ipod-pop-enter-active,
.ipod-pop-leave-active {
  transition: transform 0.28s cubic-bezier(0.3, 0.7, 0.3, 1);
}

.ipod-push-enter-from,
.ipod-pop-leave-to {
  transform: translateX(100%);
}

.ipod-push-leave-to,
.ipod-pop-enter-from {
  transform: translateX(-100%);
}
</style>
