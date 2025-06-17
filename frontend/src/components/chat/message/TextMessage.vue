<script setup lang="ts">
import type { IMessage } from '@/models/message-model'
import { formatTimeForMessage, getMessageContent, getEmojiMessageStyle } from './MessageUtils'

defineProps<{
  message: IMessage
  showTimestamp: boolean
}>()
</script>

<template>
  <div class="relative message-content">
    <div class="message-text-container" :class="{ 'emoji-wrapper': getEmojiMessageStyle(getMessageContent(message)) }">
      <p :class="[
        'message-text',
        showTimestamp ? 'has-timestamp' : '',
        getEmojiMessageStyle(getMessageContent(message))
      ]">
        {{ getMessageContent(message) }}
      </p>
      <span
        v-if="showTimestamp && !getEmojiMessageStyle(getMessageContent(message))"
        class="text-xs opacity-70 message-timestamp"
      >
        {{ formatTimeForMessage(message.timestamp) }}
      </span>
    </div>
    <span
      v-if="showTimestamp && getEmojiMessageStyle(getMessageContent(message))"
      class="text-xs opacity-70 message-timestamp emoji-timestamp"
    >
      {{ formatTimeForMessage(message.timestamp) }}
    </span>
  </div>
</template>

<style scoped>
.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-text.emoji-only {
  background-color: transparent !important;
  padding: 0;
  font-size: 2rem;
}

.message-text.emoji-only.emoji-single {
  font-size: 4rem;
}

.message-text.emoji-only.emoji-few {
  font-size: 2.5rem;
}

.message-text.emoji-only.emoji-many {
  font-size: 1.5rem;
}

.message-text-container {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.message-text {
  margin: 0;
  padding: 0;
}

.message-timestamp {
  position: relative;
  display: inline-flex;
  align-self: flex-end;
  margin-bottom: 1px;
  white-space: nowrap;
  z-index: 2;
}

.emoji-timestamp {
  display: block;
  text-align: right;
  margin-top: 4px;
  padding-right: 4px;
  z-index: 2;
}

.emoji-wrapper {
  display: block;
}
</style>
