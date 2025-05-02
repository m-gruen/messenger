<script setup lang="ts">
import { defineProps, computed } from 'vue'
import type { IMessage } from '@/models/message-model'
import { MessageSquare } from 'lucide-vue-next'

const props = defineProps({
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

// Format time (hours:minutes) in 24-hour format
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Format date with European style (dd.mm.yyyy)
function formatFullDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')
}

// Group messages by date
const messageGroups = computed(() => {
  if (!props.messages.length) return []
  
  const groups: { dateLabel: string, dateValue: string, messages: IMessage[] }[] = []
  let currentDate: string | null = null
  let currentMessages: IMessage[] = []
  
  // Create a copy of messages and sort by timestamp (oldest first)
  // This is needed because the UI displays messages in reverse order (newest at bottom)
  const sortedMessages = [...props.messages].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime()
    const dateB = new Date(b.timestamp).getTime()
    return dateA - dateB
  })
  
  // Get today, yesterday, and a week ago for comparison
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const oneWeekAgo = new Date(today)
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6) // 6 days ago + today = 7 days
  
  // Define day names in English
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  // Process each message
  for (const message of sortedMessages) {
    const timestamp = new Date(message.timestamp)
    const messageDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate())
    const dateString = messageDate.toISOString().split('T')[0]
    
    let dateLabel: string
    
    // Generate date label
    if (messageDate.getTime() === today.getTime()) {
      dateLabel = 'Today'
    } else if (messageDate.getTime() === yesterday.getTime()) {
      dateLabel = 'Yesterday'
    } else if (messageDate >= oneWeekAgo) {
      dateLabel = weekdays[messageDate.getDay()]
    } else {
      dateLabel = formatFullDate(messageDate)
    }
    
    // Check if we need to start a new group
    if (currentDate !== dateString) {
      if (currentDate !== null) {
        // Add the previous group to our list
        groups.push({
          dateLabel: currentMessages[0] ? getLabelForDate(new Date(currentMessages[0].timestamp)) : '',
          dateValue: currentDate,
          messages: [...currentMessages]
        })
      }
      
      // Start a new group
      currentDate = dateString
      currentMessages = [message]
    } else {
      // Add to the current group
      currentMessages.push(message)
    }
  }
  
  // Don't forget to add the last group
  if (currentMessages.length > 0) {
    groups.push({
      dateLabel: currentMessages[0] ? getLabelForDate(new Date(currentMessages[0].timestamp)) : '',
      dateValue: currentDate!,
      messages: [...currentMessages]
    })
  }
  
  return groups
})

// Helper function to get date label
function getLabelForDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const oneWeekAgo = new Date(today)
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6)
  
  // Define day names in English
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (messageDate.getTime() === today.getTime()) {
    return 'Today'
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else if (messageDate >= oneWeekAgo) {
    return weekdays[messageDate.getDay()]
  } else {
    return formatFullDate(messageDate)
  }
}

// Format time for message timestamp display
function formatTimeForMessage(dateString: string | Date | undefined) {
  if (!dateString) return 'Unknown time'

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString)
      return 'Just now'
    }
    return formatTime(date)
  } catch (err) {
    console.error('Error formatting date:', err, dateString)
    return 'Just now'
  }
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 bg-background/95 message-list-container"
    style="background-image: url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E');">
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <div class="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
      <span class="ml-2">Loading messages...</span>
    </div>

    <div v-else-if="error" class="flex items-center justify-center h-full">
      <div class="bg-destructive/10 text-destructive p-4 rounded-md max-w-[80%] text-center">
        <p class="font-medium">Error loading messages</p>
        <p>{{ error }}</p>
      </div>
    </div>

    <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
      <div class="bg-card p-6 rounded-lg shadow-lg">
        <MessageSquare class="h-12 w-12 mx-auto text-muted-foreground" />
        <p class="mt-4 text-muted-foreground">No messages yet with {{ contactUsername }}</p>
        <p class="mt-2 text-sm text-muted-foreground">Send a message to start the conversation</p>
      </div>
    </div>

    <div v-else class="flex flex-col space-y-6">
      <!-- Iterate through date groups -->
      <div v-for="(group, groupIndex) in messageGroups" :key="group.dateValue">
        <!-- Date header -->
        <div class="flex justify-center mb-4">
          <div class="bg-muted/70 text-muted-foreground text-xs px-4 py-1 rounded-full">
            {{ group.dateLabel }}
          </div>
        </div>
        
        <!-- Messages in this group -->
        <div class="flex flex-col space-y-4">
          <div v-for="message in group.messages" :key="message.mid" :class="{
            'flex justify-end': message.sender_uid === currentUserId,
            'flex justify-start': message.sender_uid !== currentUserId
          }">
            <div class="max-w-[70%] rounded-lg p-3 shadow-sm" :class="{
              'bg-blue-600 text-white rounded-br-none': message.sender_uid === currentUserId,
              'bg-zinc-800 text-white rounded-bl-none': message.sender_uid !== currentUserId
            }">
              <p class="mb-1">{{ message.content }}</p>
              <div class="flex justify-end">
                <span class="text-xs opacity-70">
                  {{ formatTimeForMessage(message.timestamp) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>