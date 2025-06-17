<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import type { IMessage } from '@/models/message-model'
import { formatTimeForMessage, getImageSource, getImageName, getImageSize } from './MessageUtils'

defineProps<{
  message: IMessage
  showTimestamp: boolean
}>()

const emit = defineEmits<{
  'view-image': [src: string | null]
}>()
</script>

<template>
  <div class="image-container" :class="[showTimestamp ? 'has-timestamp' : '']">
    <template v-if="getImageSource(message)">
      <div class="image-wrapper">
        <img
          :src="getImageSource(message) || ''"
          alt="Image message"
          class="rounded-lg max-w-full"
          style="max-height: 300px; max-width: 100%;"
          @click="emit('view-image', getImageSource(message))"
        />
        <div class="image-info-overlay">
          <div class="image-name font-medium truncate">
            {{ getImageName(message) }}
          </div>
          <div class="image-size text-xs opacity-70">
            {{ getImageSize(message) }}
          </div>
        </div>
        <a
          :href="getImageSource(message) || undefined"
          :download="getImageName(message)"
          class="image-download-button"
          title="Download image"
          @click.stop
        >
          <Download class="h-5 w-5" />
        </a>
      </div>
      <span
        v-if="showTimestamp"
        class="text-xs opacity-70 message-timestamp image-timestamp"
      >
        {{ formatTimeForMessage(message.timestamp) }}
      </span>
    </template>
    <div v-else class="image-error p-2 text-destructive">
      Image data could not be loaded
    </div>
  </div>
</template>

<style scoped>
.image-container {
  position: relative;
  width: 100%;
}

.image-wrapper {
  position: relative;
  display: inline-block;
  border-radius: 8px;
  overflow: hidden;
  max-width: 100%;
}

.image-info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
  padding: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-wrapper:hover .image-info-overlay {
  opacity: 1;
}

.image-download-button {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  color: white;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.image-wrapper:hover .image-download-button {
  opacity: 1;
}

.image-download-button:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

.image-timestamp {
  position: relative;
  display: block;
  text-align: right;
  margin-top: 4px;
  padding-right: 4px;
  z-index: 2;
}

.image-error {
  background-color: rgba(var(--destructive), 0.1);
  border-radius: 8px;
}
</style>
