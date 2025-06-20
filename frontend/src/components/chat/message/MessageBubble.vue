<script setup lang="ts">
import { computed } from 'vue'
import type { IMessage } from '@/models/message-model'
import { getMessagePosition, getMessageContent, getEmojiMessageStyle, isImageMessage, isDocumentMessage, isAudioMessage, isCodeMessage } from './MessageUtils'
import { messageContentService } from '@/services/message-content.service'
import { useContactStore } from '@/stores/ContactStore'
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
  'download-file': [src: string | null, filename: string],
  'reply': [message: IMessage]
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

const contactStore = useContactStore()

// Determine if the message is a reply
const parsedContent = computed(() => {
  try {
    return messageContentService.parseMessageContent(props.message.content)
  } catch (e) {
    return { type: 'text', content: props.message.content || '' }
  }
})

const isReply = computed(() => {
  return !!parsedContent.value.replyTo
})

const replyInfo = computed(() => {
  if (!isReply.value) return null
  return parsedContent.value.replyTo
})

// Get the reply sender name
const replySenderName = computed(() => {
  if (!replyInfo.value) return ''
  // If the reply is to your own message
  if (replyInfo.value.sender_uid === props.currentUserId) {
    return 'You'
  }
  // Try to get the contact's name from the contact store
  const contact = contactStore.contacts.find(c => c.contactUserId === replyInfo.value?.sender_uid)
  return contact?.display_name || contact?.username || 'Unknown'
})

// Get the reply preview text
const replyPreviewText = computed(() => {
  if (!replyInfo.value) return ''
  
  try {
    if (replyInfo.value.type === 'text') {
      // For text messages, truncate if needed
      const preview = replyInfo.value.preview || ''
      return preview.substring(0, 50) + (preview.length > 50 ? '...' : '')
    } else {
      return `[${replyInfo.value.type.charAt(0).toUpperCase() + replyInfo.value.type.slice(1)}]`
    }
  } catch (e) {
    return replyInfo.value.preview || ''
  }
})

// Determine if this is an emoji-only message that should get special handling
const isEmojiOnlyMessage = computed(() => {
  return !!getEmojiMessageStyle(getMessageContent(props.message))
})

// For reply messages with emoji, we need to override the default emoji style
const shouldForceBackground = computed(() => {
  return isReply.value && isEmojiOnlyMessage.value
})
</script>

<template>
  <div class="message-wrapper relative group" :class="{
      'own-message': isOwnMessage,
      'other-message': !isOwnMessage
    }">
    <div class="message-bubble relative" :class="[
      (!shouldForceBackground && getEmojiMessageStyle(getMessageContent(message))) || 'px-3 py-2 shadow-sm',
      {
        'bg-blue-600 text-white': (message.sender_uid === currentUserId && (!getEmojiMessageStyle(getMessageContent(message)) || shouldForceBackground)),
        'bg-zinc-800 text-white': (message.sender_uid !== currentUserId && (!getEmojiMessageStyle(getMessageContent(message)) || shouldForceBackground)),
        'mb-0.5': messageIndex < minuteGroup.messages.length - 1,
        'max-w-message': true,
        'with-reply': isReply
      },
      !getEmojiMessageStyle(getMessageContent(message)) || (isReply && isEmojiOnlyMessage) ? [
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
      <!-- Reply box -->
      <div v-if="isReply" class="reply-box bg-blue-800 mb-2 rounded-md p-2 text-white text-sm" 
        :class="{'reply-box-own': isOwnMessage, 'reply-box-other': !isOwnMessage}">
        <div class="flex items-start">
          <div class="flex-1">
            <div class="font-bold">{{ replySenderName }}</div>
            <div class="text-white/80">
              <em v-if="replyPreviewText.startsWith('[')">{{ replyPreviewText }}</em>
              <template v-else>{{ replyPreviewText }}</template>
            </div>
          </div>
        </div>
      </div>
      
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
        @reply="message => emit('reply', message)" 
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

.message-bubble.with-reply {
  padding-top: 8px;
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

/* Reply box styling */
.reply-box {
  border-width: 1px;
  border-style: solid;
  position: relative;
}

.reply-box-own {
  border-color: #3b82f6; /* Blue border for your own messages */
}

.reply-box-other {
  border-color: #000000; /* Black border for other people's messages */
}

/* Special styles for emoji messages with replies */
.emoji-only.emoji-single, .emoji-only.emoji-few, .emoji-only.emoji-many {
  font-size: 1.5rem;
}

.with-reply .emoji-only.emoji-single {
  font-size: 2.5rem;
}

.with-reply .emoji-only.emoji-few {
  font-size: 2rem;
}

.with-reply .emoji-only.emoji-many {
  font-size: 1.5rem;
}
</style>
