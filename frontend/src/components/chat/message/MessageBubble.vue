<script setup lang="ts">
import { computed } from 'vue'
import type { IMessage } from '@/models/message-model'
import { getMessagePosition, getMessageContent, getEmojiMessageStyle, isImageMessage, isDocumentMessage, isAudioMessage, isCodeMessage } from './MessageUtils'
import MessageActions from './MessageActions.vue'
import TextMessage from './TextMessage.vue'
import ImageMessage from './ImageMessage.vue'
import DocumentMessage from './DocumentMessage.vue'
import AudioMessage from './AudioMessage.vue'
import CodeMessage from './CodeMessage.vue'

const props = defineProps<{
  message: IMessage
  minuteGroup: { sender: number, messages: IMessage[], minute: string }
  messageIndex: number
  currentUserId: number
}>()

const emit = defineEmits<{
  'view-image': [src: string | null],
  'view-code': [content: string, language: string, name: string],
  'download-file': [src: string | null, filename: string]
}>()

const isOwnMessage = computed(() => props.message.sender_uid === props.currentUserId)

const showTimestamp = computed(() => {
  return getMessagePosition(props.message, props.minuteGroup) === 'single' || 
         getMessagePosition(props.message, props.minuteGroup) === 'last'
})

const messageType = computed(() => {
  const content = props.message.content
  if (isImageMessage(content)) return 'image'
  if (isDocumentMessage(content)) return 'document'
  if (isAudioMessage(content)) return 'audio'
  if (isCodeMessage(content)) return 'code'
  return 'text'
})
</script>

<template>
  <div class="message-wrapper relative group" :class="{
      'own-message': isOwnMessage,
      'other-message': !isOwnMessage
    }">
    <div class="message-bubble relative" :class="[
      getEmojiMessageStyle(getMessageContent(message)) || 'px-3 py-2 shadow-sm',
      {
        'bg-blue-600 text-white': message.sender_uid === currentUserId && !getEmojiMessageStyle(getMessageContent(message)),
        'bg-zinc-800 text-white': message.sender_uid !== currentUserId && !getEmojiMessageStyle(getMessageContent(message)),
        'mb-0.5': messageIndex < minuteGroup.messages.length - 1,
        'max-w-message': true
      },
      !getEmojiMessageStyle(getMessageContent(message)) ? [
        getMessagePosition(message, minuteGroup) === 'single' ? 'message-bubble-rounded' : '',
        getMessagePosition(message, minuteGroup) === 'first' && message.sender_uid === currentUserId ?
          'message-bubble-rounded-top message-bubble-rounded-left message-bubble-bottom-left' : '',
        getMessagePosition(message, minuteGroup) === 'first' && message.sender_uid !== currentUserId ?
          'message-bubble-rounded-top message-bubble-rounded-right message-bubble-bottom-right' : '',
        getMessagePosition(message, minuteGroup) === 'middle' && message.sender_uid === currentUserId ?
          'message-bubble-rounded-left' : '',
        getMessagePosition(message, minuteGroup) === 'middle' && message.sender_uid !== currentUserId ?
          'message-bubble-rounded-right' : '',
        getMessagePosition(message, minuteGroup) === 'last' && message.sender_uid === currentUserId ?
          'message-bubble-rounded-bottom message-bubble-rounded-left message-bubble-top-left' : '',
        getMessagePosition(message, minuteGroup) === 'last' && message.sender_uid !== currentUserId ?
          'message-bubble-rounded-bottom message-bubble-rounded-right message-bubble-top-right' : ''
      ] : []
    ]">
      <TextMessage v-if="messageType === 'text'" :message="message" :showTimestamp="showTimestamp" />
      
      <ImageMessage 
        v-else-if="messageType === 'image'" 
        :message="message" 
        :showTimestamp="showTimestamp" 
        @view-image="src => emit('view-image', src)" 
      />
      
      <DocumentMessage 
        v-else-if="messageType === 'document'" 
        :message="message" 
        :showTimestamp="showTimestamp" 
        @download-file="(src, filename) => emit('download-file', src, filename)" 
      />
      
      <AudioMessage 
        v-else-if="messageType === 'audio'" 
        :message="message" 
        :showTimestamp="showTimestamp" 
      />
      
      <CodeMessage 
        v-else-if="messageType === 'code'" 
        :message="message" 
        :showTimestamp="showTimestamp" 
        @view-code="(content, language, name) => emit('view-code', content, language, name)" 
      />

      <!-- Message actions positioned relative to each bubble -->
      <MessageActions 
        :is-own-message="isOwnMessage" 
        :message="message"
        :is-text-message="messageType === 'text'" 
      />
    </div>
  </div>
</template>

<style scoped>
.message-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.own-message {
  align-items: flex-end;
}

.other-message {
  align-items: flex-start;
}

.message-bubble {
  display: inline-block;
  max-width: 100%;
  position: relative; /* Ensure position: relative is here for absolute positioning of children */
}

.message-bubble:hover .message-actions {
  opacity: 1;
}

.message-bubble-rounded {
  border-radius: 18px;
}

.message-bubble-rounded-left {
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
}

.message-bubble-rounded-right {
  border-top-right-radius: 18px;
  border-bottom-right-radius: 18px;
}

.message-bubble-rounded-top {
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
}

.message-bubble-rounded-bottom {
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
}

.message-bubble-top-left {
  border-top-left-radius: 18px;
}

.message-bubble-top-right {
  border-top-right-radius: 18px;
}

.message-bubble-bottom-left {
  border-bottom-left-radius: 18px;
}

.message-bubble-bottom-right {
  border-bottom-right-radius: 18px;
}

.max-w-message {
  max-width: 100%;
  word-break: break-word;
  overflow-wrap: break-word;
}
</style>
