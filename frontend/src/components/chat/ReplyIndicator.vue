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
  <div class="bg-blue-600 mb-2 rounded-md p-2 text-white text-sm relative">
    <div class="flex items-start">
      <!-- Reply icon -->
      <div class="mt-0.5 mr-2">
        <CornerUpLeft class="h-4 w-4" />
      </div>
      <!-- Reply content -->
      <div class="flex-1">
        <div class="font-bold">{{ isOwnReply ? 'You' : props.contactName }}</div>
        <div class="text-white/80">
          <em v-if="getReplyPreviewText.startsWith('[')">{{ getReplyPreviewText }}</em>
          <template v-else>{{ getReplyPreviewText }}</template>
        </div>
      </div>
      <!-- Close button -->
      <button 
        @click="cancelReply" 
        class="p-1 hover:bg-white/20 rounded-full"
        type="button"
        aria-label="Cancel reply">
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
