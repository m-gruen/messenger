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
  }
})

const emit = defineEmits<{
  'back': [],
  'toggle-details': [],
  'send-message': [content: any],
  'clear-send-error': [],
  'load-more-messages': [],
  'view-image': [src: string | null],
  'download-file': [src: string | null, filename: string]
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
    class="fixed z-10 top-0 bottom-0 border-r border-border bg-background transition-all duration-300 ease-in-out flex flex-col"
    :style="{
      left: leftPosition,
      width: width
    }">
    <!-- Chat Header -->
    <ChatHeader :contact="contact" @back="emit('back')" @details="emit('toggle-details')" />

    <!-- Send Error Alert -->
    <div v-if="sendError"
      class="mx-4 mt-2 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center justify-between">
      <span>{{ sendError }}</span>
      <button @click="emit('clear-send-error')" class="ml-2 text-destructive hover:text-destructive/80"
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
    />

    <!-- Message Input -->
    <MessageInput @send="content => emit('send-message', content)" />
  </div>
</template>
