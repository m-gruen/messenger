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
  <div class="reply-box bg-blue-800 mb-2 rounded-md p-2 text-white text-sm" 
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
</template>

<style scoped>
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
</style>
