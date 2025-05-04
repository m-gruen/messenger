<script setup lang="ts">
import { defineProps, computed } from 'vue'
import type { IMessage } from '@/models/message-model'
import { MessageSquare } from 'lucide-vue-next'
import { DateFormatService } from '@/services/date-format.service'

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

// Group messages by date and by sender & minute
const messageGroups = computed(() => {
  if (!props.messages.length) return []
  
  const groups: { dateLabel: string, dateValue: string, messages: IMessage[], minuteGroups: Array<{sender: number, messages: IMessage[], minute: string}> }[] = []
  let currentDate: string | null = null
  let currentMessages: IMessage[] = []
  
  // Create a copy of messages and sort by timestamp (oldest first)
  // This is needed because the UI displays messages in reverse order (newest at bottom)
  const sortedMessages = [...props.messages].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime()
    const dateB = new Date(b.timestamp).getTime()
    return dateA - dateB
  })
  
  // Process each message
  for (const message of sortedMessages) {
    const timestamp = new Date(message.timestamp)
    const messageDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate())
    const dateString = messageDate.toISOString().split('T')[0]
    
    // Check if we need to start a new group
    if (currentDate !== dateString) {
      if (currentDate !== null) {
        // Add the previous group to our list
        groups.push({
          dateLabel: currentMessages[0] ? DateFormatService.formatRelativeDate(new Date(currentMessages[0].timestamp)) : '',
          dateValue: currentDate,
          messages: [...currentMessages],
          minuteGroups: createMinuteGroups(currentMessages)
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
      dateLabel: currentMessages[0] ? DateFormatService.formatRelativeDate(new Date(currentMessages[0].timestamp)) : '',
      dateValue: currentDate!,
      messages: [...currentMessages],
      minuteGroups: createMinuteGroups(currentMessages)
    })
  }
  
  return groups
})

// Helper function to create minute-based message groups
function createMinuteGroups(messages: IMessage[]) {
  const minuteGroups: Array<{sender: number, messages: IMessage[], minute: string}> = []
  let currentSender: number | null = null
  let currentMinute: string | null = null
  let currentGroup: IMessage[] = []
  
  for (const message of messages) {
    const timestamp = new Date(message.timestamp)
    const minute = `${timestamp.getHours()}:${timestamp.getMinutes()}`
    
    // Start a new group if the minute changes or the sender changes
    if (currentMinute !== minute || currentSender !== message.sender_uid) {
      if (currentMinute !== null) {
        // Add the previous group to our list
        minuteGroups.push({
          sender: currentSender!,
          minute: currentMinute,
          messages: [...currentGroup]
        })
      }
      
      // Start a new group
      currentMinute = minute
      currentSender = message.sender_uid
      currentGroup = [message]
    } else {
      // Add to the current group
      currentGroup.push(message)
    }
  }
  
  // Add the last group
  if (currentGroup.length > 0 && currentMinute !== null) {
    minuteGroups.push({
      sender: currentSender!,
      minute: currentMinute,
      messages: [...currentGroup]
    })
  }
  
  return minuteGroups
}

// Determine message position in its minute-group
function getMessagePosition(message: IMessage, group: {sender: number, messages: IMessage[], minute: string}) {
  if (group.messages.length === 1) return 'single'
  
  const index = group.messages.findIndex(m => m.mid === message.mid)
  if (index === 0) return 'first'
  if (index === group.messages.length - 1) return 'last'
  return 'middle'
}

// Format time for message timestamp display
function formatTimeForMessage(dateString: string | Date | undefined) {
  return DateFormatService.formatMessageTime(dateString);
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 bg-background/95 message-list-container custom-scrollbar"
    style="background-image: url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4-1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4-1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E');">
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
      <div v-for="group in messageGroups" :key="group.dateValue">
        <!-- Date header -->
        <div class="flex justify-center mb-4">
          <div class="bg-muted/70 text-muted-foreground text-xs px-4 py-1 rounded-full">
            {{ group.dateLabel }}
          </div>
        </div>
        
        <!-- Messages grouped by minute -->
        <div class="flex flex-col space-y-4">
          <!-- Each minute group -->
          <div v-for="(minuteGroup, groupIndex) in group.minuteGroups" :key="`${group.dateValue}-${minuteGroup.minute}-${groupIndex}`" 
               class="flex flex-col" 
               :class="{
                 'items-end pr-2': minuteGroup.sender === currentUserId,
                 'items-start pl-2': minuteGroup.sender !== currentUserId,
                 'mb-1': true
               }">
            
            <!-- Messages in this minute group - reduced width from 80% to 75% -->
            <div class="flex flex-col" style="max-width: 75%;">
              <div v-for="(message, messageIndex) in minuteGroup.messages" 
                   :key="message.mid"
                   class="px-3 py-2 shadow-sm inline-block"
                   :class="[
                     // Base styling
                     {
                       // Sender styles (you)
                       'bg-blue-600 text-white': message.sender_uid === currentUserId,
                       // Receiver styles (other person)
                       'bg-zinc-800 text-white': message.sender_uid !== currentUserId,
                       
                       // Spacing between messages in the same group
                       'mb-0.5': messageIndex < minuteGroup.messages.length - 1,
                       
                       // Self-align each message
                       'self-end': message.sender_uid === currentUserId,
                       'self-start': message.sender_uid !== currentUserId,
                       
                       // Maximum width for messages
                       'max-w-message': true
                     },
                     // Single message (completely rounded)
                     getMessagePosition(message, minuteGroup) === 'single' ? 'message-bubble-rounded' : '',
                     
                     // First message in group
                     getMessagePosition(message, minuteGroup) === 'first' && message.sender_uid === currentUserId ? 
                       'message-bubble-rounded-top message-bubble-rounded-left message-bubble-bottom-left' : '',
                     getMessagePosition(message, minuteGroup) === 'first' && message.sender_uid !== currentUserId ? 
                       'message-bubble-rounded-top message-bubble-rounded-right message-bubble-bottom-right' : '',
                     
                     // Middle messages in group
                     getMessagePosition(message, minuteGroup) === 'middle' && message.sender_uid === currentUserId ? 
                       'message-bubble-rounded-left' : '',
                     getMessagePosition(message, minuteGroup) === 'middle' && message.sender_uid !== currentUserId ? 
                       'message-bubble-rounded-right' : '',
                     
                     // Last message in group
                     getMessagePosition(message, minuteGroup) === 'last' && message.sender_uid === currentUserId ? 
                       'message-bubble-rounded-bottom message-bubble-rounded-left message-bubble-top-left' : '',
                     getMessagePosition(message, minuteGroup) === 'last' && message.sender_uid !== currentUserId ? 
                       'message-bubble-rounded-bottom message-bubble-rounded-right message-bubble-top-right' : ''
                   ]">
                <!-- Fixed message layout with only last line having padding for timestamp -->
                <div class="relative message-content">
                  <p :class="['message-text', (getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') ? 'has-timestamp' : '']">
                    {{ message.content }}
                  </p>
                  
                  <!-- Show time only in single or last messages in a group -->
                  <span v-if="getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last'" 
                        class="text-xs opacity-70 message-timestamp">
                    {{ formatTimeForMessage(message.timestamp) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px; /* Thin scrollbar */
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent; /* Transparent background */
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(128, 128, 128, 0.4); /* Semi-transparent gray */
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(128, 128, 128, 0.6); /* Slightly more visible on hover */
}

/* Hide scrollbar buttons (arrows) - multiple approaches for different browsers */
.custom-scrollbar::-webkit-scrollbar-button {
  display: none;
  height: 0;
  width: 0;
}

.custom-scrollbar::-webkit-scrollbar-button:start:decrement,
.custom-scrollbar::-webkit-scrollbar-button:end:increment {
  display: none;
}

/* For Firefox */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
}

/* Additional override to ensure no buttons are shown */
.custom-scrollbar * {
  -ms-overflow-style: none;
  scrollbar-width: thin;
}

/* Custom message bubble styles with increased roundness */
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

/* Timestamp positioning */
.message-content {
  min-width: 14px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  padding: 0;
}

/* Only add space for timestamp in messages that have it */
.message-text.has-timestamp::after {
  content: '';
  display: inline-block;
  width: 40px; /* Space for timestamp */
}

.message-timestamp {
  position: absolute;
  right: 3px;
  bottom: 0;
  margin: 0;
  padding: 0;
  font-size: 0.65rem;
  white-space: nowrap;
}

/* Control maximum width of messages */
.max-w-message {
  max-width: 100%;
}
</style>
