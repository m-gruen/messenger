<script setup lang="ts">
import { defineProps, defineEmits, watch } from 'vue'
import ChatHeader from './ChatHeader.vue'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'
import type { Contact } from '@/models/contact-model'
import type { IMessage } from '@/models/message-model'

const props = defineProps({
  contact: {
    type: Object as () => Contact,
    required: true
  },
  messages: {
    type: Array as () => IMessage[],
    default: () => []
  },
  isLoadingMessages: {
    type: Boolean,
    default: false
  },
  messagesError: {
    type: String,
    default: undefined
  },
  sendError: {
    type: String,
    default: undefined
  },
  currentUserId: {
    type: Number,
    required: true
  },
  leftPosition: {
    type: String,
    required: true
  },
  width: {
    type: String,
    required: true
  },
  replyToMessage: {
    type: Object as () => { message: IMessage } | null,
    default: null
  }
})

const emit = defineEmits<{
  'back': [],
  'toggle-details': [],
  'send-message': [content: any],
  'clear-send-error': [],
  'load-more-messages': [],
  'view-image': [src: string | null],
  'view-code': [content: string, language: string, name: string],
  'download-file': [src: string | null, filename: string],
  'reply': [message: IMessage],
  'cancel-reply': []
}>()

// Automatically dismiss send error after 5 seconds
watch(() => props.sendError, (error) => {
  if (error) {
    setTimeout(() => {
      emit('clear-send-error')
    }, 5000)
  }
})
</script>

<template>
  <div
    class="fixed z-10 top-0 bottom-0 border-r border-indigo-900/30 bg-slate-900 transition-all duration-300 ease-in-out flex flex-col"
    :style="{
      left: leftPosition,
      width: width
    }">
    <!-- Chat Header -->
    <ChatHeader :contact="contact" @back="emit('back')" @details="emit('toggle-details')" />

    <!-- Send Error Alert -->
    <div v-if="sendError"
      class="mx-4 mt-2 p-3 bg-rose-900/30 text-rose-300 text-sm rounded-md flex items-center justify-between border border-rose-800/50">
      <span>{{ sendError }}</span>
      <button @click="emit('clear-send-error')" class="ml-2 text-rose-300 hover:text-rose-100 transition-colors"
        aria-label="Dismiss error">
        ✕
      </button>
    </div>

    <!-- Message List -->
    <MessageList 
      :messages="messages" 
      :current-user-id="currentUserId" 
      :is-loading="isLoadingMessages"
      :error="messagesError" 
      :contact-username="contact.username" 
      @load-more-messages="emit('load-more-messages')"
      @view-image="src => emit('view-image', src)"
      @view-code="(content, language, name) => emit('view-code', content, language, name)"
      @reply="message => emit('reply', message)"
    />

    <!-- Message Input -->
    <MessageInput 
      :replyTo="replyToMessage"
      :currentUserId="currentUserId"
      :contact="contact"
      @send="content => emit('send-message', content)"
      @cancelReply="emit('cancel-reply')" 
    />
  </div>
</template>
