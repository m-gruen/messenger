<script setup lang="ts">
import { computed } from 'vue'
import type { IReplyInfo } from '@/models/message-model'
import { useContactStore } from '@/stores/ContactStore'

const props = defineProps<{
  replyInfo: IReplyInfo | null
  isOwnMessage: boolean  // Whether the message containing this reply is from the current user
  currentUserId: number
}>()

const contactStore = useContactStore()

// Get the reply sender name
const replySenderName = computed(() => {
  if (!props.replyInfo) return ''
  
  // If the reply is to your own message
  if (props.replyInfo.sender_uid === props.currentUserId) {
    return 'You'
  }
  
  // Try to get the contact's name from the contact store
  const contact = contactStore.contacts.find(c => c.contactUserId === props.replyInfo?.sender_uid)
  return contact?.display_name || contact?.username || 'Unknown'
})

// Get the reply preview text
const replyPreviewText = computed(() => {
  if (!props.replyInfo) return ''
  
  try {
    if (props.replyInfo.type === 'text') {
      // For text messages, truncate if needed
      const preview = props.replyInfo.preview || ''
      return preview.substring(0, 50) + (preview.length > 50 ? '...' : '')
    } else {
      return `[${props.replyInfo.type.charAt(0).toUpperCase() + props.replyInfo.type.slice(1)}]`
    }
  } catch (e) {
    return props.replyInfo.preview || ''
  }
})
</script>

<template>
  <div class="bg-gradient-to-r from-indigo-900/80 to-blue-900/80 mb-2 rounded-md p-2.5 text-indigo-100 text-sm relative border border-indigo-500/30 shadow-md">
    <div class="flex items-start">
      <!-- Reply icon -->
      <div class="mt-0.5 mr-3 bg-indigo-700/50 p-1.5 rounded-md">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
          <polyline points="9 14 4 9 9 4"></polyline>
          <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
        </svg>
      </div>
      <!-- Reply content -->
      <div class="flex-1">
        <div class="font-semibold text-indigo-100">{{ replySenderName }}</div>
        <div class="text-indigo-200/80">
          <em v-if="replyPreviewText.startsWith('[')">{{ replyPreviewText }}</em>
          <template v-else>{{ replyPreviewText }}</template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>
