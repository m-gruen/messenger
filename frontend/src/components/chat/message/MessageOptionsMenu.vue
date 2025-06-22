<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Trash2, Copy, X, Forward } from 'lucide-vue-next'
import { useMessageStore } from '@/stores/MessageStore'
import { getMessageContent } from './MessageUtils'
import type { IMessage } from '@/models/message-model'

const props = defineProps<{
  isOpen: boolean,
  message: IMessage,
  isTextMessage: boolean,
  anchorRect: DOMRect | null, // The position of the button that triggered this menu
  isOwnMessage: boolean,
  portalTarget?: string // Optional target for teleport (for DOM placement)
}>()

const emit = defineEmits<{
  'close': []
  'forward': [message: IMessage]
}>()

const messageStore = useMessageStore()
const menuRef = ref<HTMLElement | null>(null)

// Close the options menu
const closeOptionsMenu = () => {
  emit('close')
}

// Delete message handler
const deleteMessage = async (event: Event) => {
  event.stopPropagation()
  if (props.message.mid) {
    await messageStore.deleteLocalMessage(props.message.mid)
    closeOptionsMenu()
  }
}

// Forward message handler
const forwardMessage = (event: Event) => {
  event.stopPropagation()
  emit('forward', props.message)
  closeOptionsMenu()
}

// Copy message text handler
const copyMessageText = (event: Event) => {
  event.stopPropagation()
  if (props.isTextMessage && props.message.content) {
    try {
      // Use getMessageContent to get the actual message text
      const messageText = getMessageContent(props.message)
      navigator.clipboard.writeText(messageText)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
    closeOptionsMenu()
  }
}

// Global click handler to close the options menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (props.isOpen && 
      menuRef.value && 
      !menuRef.value.contains(target) && 
      !target.closest('.message-action-button')) {
    closeOptionsMenu()
  }
}

// Setup and cleanup for click outside listener
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <teleport :to="portalTarget || '#portal-target'">
    <div v-if="isOpen" 
        class="options-menu"
        ref="menuRef"
        :class="{
          'options-menu-left': isOwnMessage,
          'options-menu-right': !isOwnMessage
        }"
        :style="{ 
          top: anchorRect ? `${anchorRect.top - 10}px` : '0',
          left: anchorRect ? `${anchorRect.left + (anchorRect.width/2)}px` : '0',
        }"
        @click.stop>
      <button class="options-menu-item" @click="deleteMessage">
        <div class="flex items-center">
          <Trash2 class="h-4 w-4 mr-2" />
          <span>Delete message</span>
        </div>
        <X class="h-4 w-4 options-menu-close" @click.stop="closeOptionsMenu" />
      </button>
      <button class="options-menu-item" @click="forwardMessage">
        <div class="flex items-center">
          <Forward class="h-4 w-4 mr-2" />
          <span>Forward message</span>
        </div>
      </button>
      <button v-if="isTextMessage" class="options-menu-item" @click="copyMessageText">
        <div class="flex items-center">
          <Copy class="h-4 w-4 mr-2" />
          <span>Copy message</span>
        </div>
      </button>
    </div>
  </teleport>
</template>

<style scoped>
.options-menu {
  position: fixed; /* Fixed position relative to viewport */
  transform: translateY(-100%); /* Position above */
  margin-top: -10px; /* Add some space above the trigger button */
  width: 200px;
  background-color: #101016;
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
  z-index: 9999; /* Make sure it's above everything */
  overflow: hidden;
  animation: slideIn 0.15s ease-out;
}

/* Left and right positioning for own vs other messages */
.options-menu-left {
  transform: translate(-90%, -100%);
}

.options-menu-right {
  transform: translate(-10%, -100%);
}

.options-menu-close {
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.options-menu-close:hover {
  color: white;
}

.options-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: rgba(224, 231, 255, 0.9);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.9rem;
}

.options-menu-item:hover {
  background-color: rgba(79, 70, 229, 0.2);
  color: white;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-90%);
  }
  to {
    opacity: 1;
    transform: translateY(-100%);
  }
}
</style>
