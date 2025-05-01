<script setup lang="ts">
import { defineProps } from 'vue'
import type { IMessage } from '@/models/message-model'
import { MessageSquare } from 'lucide-vue-next'

defineProps({
  messages: {
    type: Array as () => IMessage[],
    default: () => []
  },
  currentUserId: {
    type: Number,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: undefined
  },
  contactUsername: {
    type: String,
    required: true
  }
})

function formatDate(dateString: string | Date | undefined) {
  if (!dateString) return 'Unknown date'

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString)
      return 'Just now'
    }
    return date.toLocaleString()
  } catch (err) {
    console.error('Error formatting date:', err, dateString)
    return 'Just now'
  }
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 bg-background/95"
    style="background-image: url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E');">
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <div class="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
      <span class="ml-2">Loading messages...</span>
    </div>

    <div v-else-if="error" class="bg-destructive/10 text-destructive p-4 rounded-md m-auto">
      {{ error }}
    </div>

    <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
      <div class="bg-card p-6 rounded-lg shadow-lg">
        <MessageSquare class="h-12 w-12 mx-auto text-muted-foreground" />
        <p class="mt-4 text-muted-foreground">No messages yet with {{ contactUsername }}</p>
        <p class="mt-2 text-sm text-muted-foreground">Send a message to start the conversation</p>
      </div>
    </div>

    <div v-else class="flex flex-col-reverse space-y-reverse space-y-4">
      <div v-for="message in messages" :key="message.mid" :class="{
        'flex justify-end': message.sender_uid === currentUserId,
        'flex justify-start': message.sender_uid !== currentUserId
      }">
        <div class="max-w-[70%] rounded-lg p-3 shadow-sm" :class="{
          'bg-primary text-primary-foreground rounded-br-none': message.sender_uid === currentUserId,
          'bg-card rounded-bl-none': message.sender_uid !== currentUserId
        }">
          <p class="mb-1">{{ message.content }}</p>
          <div class="flex justify-end">
            <span class="text-xs opacity-70">
              {{ formatDate(message.timestamp) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>