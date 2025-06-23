<script setup lang="ts">
import { Code, Download } from 'lucide-vue-next'
import type { IMessage } from '@/models/message-model'
import { formatTimeForMessage, getCodeContent, getCodeLanguage, getCodeName, getCodeSize, formatCode } from './MessageUtils'

defineProps<{
  message: IMessage
  showTimestamp: boolean
}>()

const emit = defineEmits<{
  'view-code': [content: string, language: string, name: string]
}>()
</script>

<template>
  <div class="code-container" :class="[showTimestamp ? 'has-timestamp' : '']">
    <div class="code-preview">
      <div class="code-header flex items-center justify-between p-2 bg-zinc-800 border-b border-zinc-700 rounded-t-lg">
        <div class="flex items-center">
          <Code class="h-5 w-5 mr-2 text-blue-400" />
          <div class="code-name font-medium truncate">
            {{ getCodeName(message) }}
          </div>
          <div class="code-size text-xs opacity-70 ml-2">
            {{ getCodeSize(message) }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="code-expand-button"
            title="Expand code"
            @click.stop="emit('view-code', getCodeContent(message), getCodeLanguage(message), getCodeName(message))"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </button>
          <a 
             :href="`data:text/plain;charset=utf-8,${encodeURIComponent(getCodeContent(message))}`" 
             :download="getCodeName(message)"
             class="code-download-button" 
             title="Download code file" 
             @click.stop
          >
            <Download class="h-5 w-5" />
          </a>
        </div>
      </div>
      <div class="code-content p-0">
        <pre class="text-sm m-0 p-4"><code v-html="formatCode(getCodeContent(message), getCodeLanguage(message))"></code></pre>
      </div>
      <span
        v-if="showTimestamp"
        class="text-xs opacity-70 message-timestamp code-timestamp"
      >
        {{ formatTimeForMessage(message.timestamp) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.code-container {
  position: relative;
  margin: 8px 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.code-header {
  padding: 8px 12px;
  background-color: #1f2937;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.code-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.code-size {
  color: rgba(155, 155, 155, 0.8);
  margin-left: 8px;
  font-size: 0.75rem;
}

.code-content {
  max-height: 300px;
  position: relative;
  overflow: auto;
  background-color: #18181B; /* Consistent bg color for zinc-900 */
}

.code-content pre {
  margin: 0;
  padding: 1rem;
  background-color: transparent; /* Remove background from pre, use parent bg */
  min-width: 100%; /* Ensures background extends with content */
  box-sizing: border-box;
  overflow-wrap: normal;
  white-space: pre;
}

.code-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.code-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-bottom-right-radius: 12px;
}

.code-content::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
}

.code-content::-webkit-scrollbar-corner {
  background-color: #18181B; /* Match code background */
}

.code-download-button {
  background-color: rgba(255, 255, 255, 0.1);
  color: inherit;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  cursor: pointer;
}

.code-download-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.code-timestamp {
  position: relative;
  display: block;
  text-align: right;
  margin-top: 4px;
  padding-right: 4px;
  z-index: 2;
}

.code-expand-button,
.code-download-button {
  padding: 0.25rem;
  border-radius: 0.375rem;
  color: rgba(255, 255, 255, 0.8);
  transition-property: color, background-color;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.code-expand-button:hover,
.code-download-button:hover {
  color: rgba(255, 255, 255, 1);
}
</style>
