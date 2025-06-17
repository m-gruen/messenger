<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import type { IMessage } from '@/models/message-model'
import { MessageSquare, ArrowDown } from 'lucide-vue-next'
import { DateFormatService } from '@/services/date-format.service'
import { createMinuteGroups } from './message/MessageUtils'
import MessageGroup from './message/MessageGroup.vue'

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

const emit = defineEmits<{
  'load-more-messages': [],
  'view-image': [src: string | null],
  'view-code': [content: string, language: string, name: string],
  'download-file': [src: string | null, filename: string]
}>()

const messageListRef = ref<HTMLElement | null>(null)
const isViewingOlderMessages = ref(false)
const scrollThreshold = 3000
const notificationOpacity = ref(0)
const isLoadingMore = ref(false)
const loadMoreThreshold = 100

const handleScroll = () => {
  if (!messageListRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = messageListRef.value
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight
  const distanceFromTop = scrollTop
  
  if (distanceFromTop < loadMoreThreshold && !isLoadingMore.value && !props.isLoading) {
    isLoadingMore.value = true
    emit('load-more-messages')
    setTimeout(() => {
      isLoadingMore.value = false
    }, 3000)
  }
  
  if (distanceFromBottom > scrollThreshold) {
    isViewingOlderMessages.value = true
    const extraScroll = distanceFromBottom - scrollThreshold
    notificationOpacity.value = Math.min(1, extraScroll / 100)
  } else {
    isViewingOlderMessages.value = false
    notificationOpacity.value = 0
  }
}

const scrollToLatest = () => {
  if (!messageListRef.value) return
  messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  isViewingOlderMessages.value = false
  notificationOpacity.value = 0
}

watch(() => props.messages, async (newMessages, oldMessages) => {
  if (!isViewingOlderMessages.value || (oldMessages && newMessages && newMessages.length > oldMessages.length)) {
    await nextTick()
    scrollToLatest()
  }
}, { deep: true })

watch(() => props.contactUsername, () => {
  isViewingOlderMessages.value = false
  notificationOpacity.value = 0
  nextTick(() => {
    scrollToLatest()
  })
})

onMounted(() => {
  if (messageListRef.value) {
    messageListRef.value.addEventListener('scroll', handleScroll)
    scrollToLatest()
  }
})

const messageGroups = computed(() => {
  if (!props.messages.length) return []
  
  const groups: { dateLabel: string, dateValue: string, messages: IMessage[], minuteGroups: Array<{ sender: number, messages: IMessage[], minute: string }> }[] = []
  let currentDate: string | null = null
  let currentMessages: IMessage[] = []
  
  const sortedMessages = [...props.messages].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime()
    const dateB = new Date(b.timestamp).getTime()
    return dateA - dateB
  })
  
  for (const message of sortedMessages) {
    const timestamp = new Date(message.timestamp)
    const messageDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate())
    const dateString = messageDate.toISOString().split('T')[0]
    
    if (currentDate !== dateString) {
      if (currentDate !== null) {
        groups.push({
          dateLabel: currentMessages[0] ? DateFormatService.formatRelativeDate(new Date(currentMessages[0].timestamp)) : '',
          dateValue: currentDate,
          messages: [...currentMessages],
          minuteGroups: createMinuteGroups(currentMessages)
        })
      }
      currentDate = dateString
      currentMessages = [message]
    } else {
      currentMessages.push(message)
    }
  }
  
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
</script>

<template>
  <div 
    class="relative flex-1 overflow-y-auto p-4 bg-background/95 message-list-container custom-scrollbar"
    ref="messageListRef"
    style="background-image: url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4-1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4-1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E');"
  >
    <!-- Notification for viewing older messages -->
    <div 
      v-if="isViewingOlderMessages"
      class="fixed bg-zinc-900 text-white rounded-full px-4 py-2 z-20 flex items-center justify-between shadow-lg older-messages-notification"
      :style="{ opacity: notificationOpacity, bottom: '100px', left: '50%', transform: 'translateX(-50%)' }"
    >
      <span class="text-sm">You're Viewing Older Messages</span>
      <button 
        @click="scrollToLatest"
        class="ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3 py-1 text-xs flex items-center"
      >
        <span>Jump To Present</span>
        <ArrowDown class="h-3 w-3 ml-1" />
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <div class="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
      <span class="ml-2">Loading messages...</span>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center h-full">
      <div class="bg-destructive/10 text-destructive p-4 rounded-md max-w-[80%] text-center">
        <p class="font-medium">Error loading messages</p>
        <p>{{ error }}</p>
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
      <div class="bg-card p-6 rounded-lg shadow-lg">
        <MessageSquare class="h-12 w-12 mx-auto text-muted-foreground" />
        <p class="mt-4 text-muted-foreground">No messages yet with {{ contactUsername }}</p>
        <p class="mt-2 text-sm text-muted-foreground">Send a message to start the conversation</p>
      </div>
    </div>
    
    <!-- Messages -->
    <div v-else class="flex flex-col space-y-6">
      <div v-for="group in messageGroups" :key="group.dateValue">
        <!-- Date header -->
        <div class="flex justify-center mb-4">
          <div class="bg-muted/70 text-muted-foreground text-xs px-4 py-1 rounded-full">
            {{ group.dateLabel }}
          </div>
        </div>
        
        <!-- Message groups -->
        <div class="flex flex-col space-y-4">
          <MessageGroup
            v-for="(minuteGroup, groupIndex) in group.minuteGroups"
            :key="`${group.dateValue}-${minuteGroup.minute}-${groupIndex}`"
            :minuteGroup="minuteGroup"
            :currentUserId="currentUserId"
            @view-image="src => emit('view-image', src)"
            @view-code="(content, language, name) => emit('view-code', content, language, name)"
            @download-file="(src, filename) => emit('download-file', src, filename)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(155, 155, 155, 0.7);
}

.max-w-message {
  max-width: 100%;
}

.older-messages-notification {
  transition: opacity 0.2s ease;
}
</style>
