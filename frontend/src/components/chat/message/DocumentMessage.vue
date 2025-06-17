<script setup lang="ts">
import { FileText, Download } from 'lucide-vue-next'
import type { IMessage } from '@/models/message-model'
import { formatTimeForMessage, getFileSource, getDocumentName, getDocumentSize } from './MessageUtils'

defineProps<{
  message: IMessage
  showTimestamp: boolean
}>()

const emit = defineEmits<{
  'download-file': [src: string | null, filename: string]
}>()
</script>

<template>
  <div class="document-container" :class="[showTimestamp ? 'has-timestamp' : '']">
    <div class="document-preview">
      <a
        :href="getFileSource(message) || undefined"
        :download="getDocumentName(message)"
        class="flex items-start p-2 rounded-lg document-link"
        @click.prevent="emit('download-file', getFileSource(message), getDocumentName(message))"
      >
        <div class="document-icon mr-2">
          <FileText class="h-8 w-8" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="document-name font-medium truncate">
            {{ getDocumentName(message) }}
          </div>
          <div class="document-size text-xs opacity-70">
            {{ getDocumentSize(message) }}
          </div>
        </div>
        <div class="document-download ml-2 flex-shrink-0">
          <Download class="h-5 w-5" />
        </div>
      </a>
      <span
        v-if="showTimestamp"
        class="text-xs opacity-70 message-timestamp document-timestamp"
      >
        {{ formatTimeForMessage(message.timestamp) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.document-container {
  position: relative;
}

.document-preview {
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
}

.document-link {
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s;
}

.document-link:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.document-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.document-name {
  max-width: 200px;
}

.document-timestamp {
  position: relative;
  display: block;
  text-align: right;
  margin-top: 4px;
  padding-right: 4px;
  z-index: 2;
}
</style>
