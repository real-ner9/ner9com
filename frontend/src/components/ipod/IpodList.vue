<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { IpodListItem } from '@/types/ipod'

/** Classic iPod menu list: white rows, the selected one in a glossy blue bar. */
const props = defineProps<{
  items: IpodListItem[]
  selected: number
  /** Taller rows with a square thumbnail, as in the Albums menu. */
  thumbs?: boolean
}>()

const emit = defineEmits<{ activate: [index: number] }>()

const listRef = ref<HTMLElement | null>(null)

// Keep the highlighted row visible while scrolling with the wheel.
watch(
  () => props.selected,
  async (index) => {
    await nextTick()
    const list = listRef.value
    const row = list?.children[index] as HTMLElement | undefined
    if (!list || !row) return
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight
    }
  },
)
</script>

<template>
  <ul ref="listRef" class="list" :class="{ 'list--thumbs': thumbs }">
    <li
      v-for="(item, index) in items"
      :key="item.id"
      class="list__row"
      :class="{ 'list__row--selected': index === selected }"
      @click="emit('activate', index)"
    >
      <img
        v-if="thumbs && item.image"
        class="list__thumb"
        :src="item.image"
        alt=""
        loading="lazy"
      />
      <span v-else-if="thumbs" class="list__thumb list__thumb--empty">♪</span>
      <span class="list__text">
        <span class="list__label">{{ item.label }}</span>
        <span v-if="item.sublabel" class="list__sublabel">{{ item.sublabel }}</span>
      </span>
      <span v-if="item.playing" class="list__playing" :aria-label="$t('ipod.playing')">🔊</span>
      <span v-if="item.trailing" class="list__trailing">{{ item.trailing }}</span>
      <span v-if="item.chevron" class="list__chevron" aria-hidden="true">›</span>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.list {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  background: #fff;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.list__row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 11cqh;
  min-height: 22px;
  padding: 0 6px;
  color: #000;
  font-weight: 700;
  font-size: max(11px, 6.2cqh);
  cursor: pointer;

  &--selected {
    background: linear-gradient(180deg, #6fb3f5 0%, #3a86e3 50%, #2468d0 51%, #1f5cc0 100%);
    color: #fff;
  }
}

.list--thumbs .list__row {
  height: 22cqh;
  min-height: 40px;
  padding-left: 0;
}

.list__thumb {
  height: 100%;
  aspect-ratio: 1;
  flex-shrink: 0;
  object-fit: cover;

  &--empty {
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #d9dbe0, #a9adb5);
    color: #fff;
    font-size: 14px;
  }
}

.list__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  line-height: 1.15;
}

.list__label,
.list__sublabel {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.list__sublabel {
  color: #6b6f78;
  font-weight: 400;
  font-size: 0.85em;
}

.list__row--selected .list__sublabel {
  color: rgba(255, 255, 255, 0.85);
}

.list__trailing {
  flex-shrink: 0;
  color: #6b6f78;
  font-weight: 400;
  font-size: 0.85em;
}

.list__row--selected .list__trailing {
  color: #fff;
}

.list__playing {
  flex-shrink: 0;
  font-size: 0.8em;
}

.list__chevron {
  flex-shrink: 0;
  color: #8a8e96;
  font-size: 1.3em;
  line-height: 1;
}

.list__row--selected .list__chevron {
  color: #fff;
}
</style>
