<script setup lang="ts">
import type { IMessage } from '@/models/message-model'
import MessageBubble from './MessageBubble.vue'

defineProps<{
  minuteGroup: { sender: number, messages: IMessage[], minute: string }
  currentUserId: number
}>()

const emit = defineEmits<{
  'view-image': [src: string | null],
  'view-code': [content: string, language: string, name: string],
  'download-file': [src: string | null, filename: string],
  'reply': [message: IMessage]
}>()
</script>

<template>
  <div class="message-group-container">
    <div class="message-bubbles-container" :class="{
      'own-messages': minuteGroup.sender === currentUserId,
      'other-messages': minuteGroup.sender !== currentUserId
    }">
      <MessageBubble 
        v-for="(message, messageIndex) in minuteGroup.messages" 
        :key="message.mid"
        :message="message"
        :messageIndex="messageIndex"
        :minuteGroup="minuteGroup"
        :currentUserId="currentUserId"
        @view-image="src => emit('view-image', src)"
        @view-code="(content, language, name) => emit('view-code', content, language, name)"
        @download-file="(src, filename) => emit('download-file', src, filename)"
        @reply="message => emit('reply', message)"
      />
    </div>
  </div>
</template>

<style scoped>
.message-group-container {
  width: 100%;
  margin-bottom: 0.25rem;
  display: flex;
  flex-direction: column;
}

.message-bubbles-container {
  max-width: 75%;
  display: flex;
  flex-direction: column;
}

.own-messages {
  align-self: flex-end;
  align-items: flex-end;
}

.other-messages {
  align-self: flex-start;
  align-items: flex-start;
}
</style>
