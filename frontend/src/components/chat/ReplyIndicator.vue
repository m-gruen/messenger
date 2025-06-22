<script setup lang="ts">
import { computed } from 'vue'
import { CornerUpLeft, X } from "lucide-vue-next"
import { messageContentService } from '@/services/message-content.service'
import type { IMessage } from '@/models/message-model'

const props = defineProps({
  replyTo: {
    type: Object as () => { message: IMessage } | null,
    default: null
  },
  currentUserId: {
    type: Number,
    default: undefined
  },
  contactName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['cancelReply'])

// Get reply preview text
const getReplyPreviewText = computed(() => {
  if (!props.replyTo?.message) return ''
  
  try {
    const parsed = messageContentService.parseMessageContent(props.replyTo.message.content)
    if (parsed.type === 'text') {
      // For text messages, truncate if needed
      return parsed.content.substring(0, 50) + (parsed.content.length > 50 ? '...' : '')
    } else {
      return `[${parsed.type.charAt(0).toUpperCase() + parsed.type.slice(1)}]`
    }
  } catch (e) {
    return props.replyTo.message.content || ''
  }
})

// Check if the reply is to our own message
const isOwnReply = computed(() => {
  if (!props.replyTo?.message || props.currentUserId === undefined) return false
  return props.replyTo.message.sender_uid === props.currentUserId
})

// Cancel reply
function cancelReply() {
  emit('cancelReply')
}
</script>

<template>
  <div class="bg-gradient-to-r from-indigo-900/80 to-blue-900/80 mb-3 rounded-md p-3 text-indigo-100 text-sm relative border border-indigo-500/30 shadow-md">
    <div class="flex items-start">
      <!-- Reply icon -->
      <div class="mt-0.5 mr-3 bg-indigo-700/50 p-1.5 rounded-md">
        <CornerUpLeft class="h-3.5 w-3.5" />
      </div>
      <!-- Reply content -->
      <div class="flex-1">
        <div class="font-semibold text-indigo-100">{{ isOwnReply ? 'You' : props.contactName }}</div>
        <div class="text-indigo-200/80">
          <em v-if="getReplyPreviewText.startsWith('[')">{{ getReplyPreviewText }}</em>
          <template v-else>{{ getReplyPreviewText }}</template>
        </div>
      </div>
      <!-- Close button -->
      <button 
        @click="cancelReply" 
        class="p-1.5 hover:bg-indigo-700/50 rounded-full transition-colors"
        type="button"
        aria-label="Cancel reply">
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
