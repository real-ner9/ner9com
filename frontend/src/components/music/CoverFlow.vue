<script setup lang="ts">
import { computed, watch } from 'vue'
import type { PropType } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { EffectCoverflow } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-coverflow'
import type { MusicAlbum } from '@/types/music'

const props = defineProps({
  albums: {
    type: Array as PropType<MusicAlbum[]>,
    required: true
  },
  activeId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits<{
  (e: 'select', album: MusicAlbum): void
}>()

const activeIndex = computed(() =>
  Math.max(
    0,
    props.albums.findIndex((album) => album.id === props.activeId)
  )
)

let swiperInstance: any = null

function handleSwiper(swiper: any) {
  swiperInstance = swiper
}

function handleSlideChange(swiper: any) {
  const album = props.albums[swiper.activeIndex]
  if (album) emit('select', album)
}

function handleAlbumClick(album: MusicAlbum, index: number) {
  if (swiperInstance) {
    swiperInstance.slideTo(index)
  }
  emit('select', album)
}

watch(
  () => props.activeId,
  (next) => {
    if (!swiperInstance || !next) return
    const idx = props.albums.findIndex((album) => album.id === next)
    if (idx >= 0) {
      swiperInstance.slideTo(idx)
    }
  }
)
</script>

<template>
  <Swiper
    class="coverflow"
    :modules="[EffectCoverflow]"
    :slides-per-view="'auto'"
    :centered-slides="true"
    :effect="'coverflow'"
    :coverflow-effect="{
      rotate: 35,
      stretch: 20,
      depth: 120,
      modifier: 1.2,
      slideShadows: false
    }"
    :initial-slide="activeIndex"
    @swiper="handleSwiper"
    @slideChange="handleSlideChange"
  >
    <SwiperSlide
      v-for="(album, index) in albums"
      :key="album.id"
      class="coverflow__slide"
      @click="handleAlbumClick(album, index)"
    >
      <div class="coverflow__card" :class="{ 'coverflow__card--active': album.id === activeId }">
        <div class="coverflow__image">
          <img
            v-if="album.coverUrl"
            :src="album.coverUrl"
            :alt="album.name"
            loading="lazy"
          />
          <div v-else class="coverflow__placeholder">♪</div>
        </div>
        <p class="coverflow__title">{{ album.name }}</p>
        <p class="coverflow__meta">{{ album.trackCount }} трек(ов)</p>
      </div>
    </SwiperSlide>
  </Swiper>
</template>

<style scoped>
.coverflow {
  width: 100%;
  padding: 20px 0 10px;
}

.coverflow__slide {
  width: 220px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.coverflow__card {
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: transform 0.25s, box-shadow 0.25s, opacity 0.25s;
  cursor: pointer;
  padding: 8px;
  border-radius: 12px;
}

.coverflow__card--active {
  transform: scale(1.02);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
}

.coverflow__image {
  width: 200px;
  height: 200px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #0f172a, #1e293b);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.coverflow__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.coverflow__placeholder {
  font-size: 36px;
  color: #cbd5f5;
}

.coverflow__title {
  margin: 0;
  font-weight: 600;
  text-align: center;
}

.coverflow__meta {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

@media (max-width: 768px) {
  .coverflow__slide {
    width: 180px;
  }
  .coverflow__card {
    width: 168px;
  }
  .coverflow__image {
    width: 168px;
    height: 168px;
  }
}
</style>
