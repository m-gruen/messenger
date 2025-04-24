<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
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
    default: null
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

const emit = defineEmits(['back', 'toggle-details', 'send-message'])
</script>

<template>
  <div class="fixed z-10 top-0 bottom-0 border-r border-border bg-background transition-all duration-300 ease-in-out flex flex-col"
    :style="{
      left: leftPosition,
      width: width
    }">
    <!-- Chat Header -->
    <ChatHeader 
      :contact="contact" 
      @back="emit('back')" 
      @details="emit('toggle-details')" 
    />

    <!-- Message List -->
    <MessageList 
      :messages="messages"
      :current-user-id="currentUserId"
      :is-loading="isLoadingMessages"
      :error="messagesError"
      :contact-username="contact.username"
    />

    <!-- Message Input -->
    <MessageInput @send="content => emit('send-message', content)" />
  </div>
</template>