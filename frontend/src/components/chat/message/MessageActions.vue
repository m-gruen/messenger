<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Reply, MoreHorizontal, Trash2, Copy, X } from 'lucide-vue-next'
import { useMessageStore } from '@/stores/MessageStore'
import { getMessageContent } from './MessageUtils'
import type { IMessage } from '@/models/message-model'

const props = defineProps<{
  isOwnMessage: boolean,
  message: IMessage,
  isTextMessage: boolean
}>()

const messageStore = useMessageStore()
const showOptionsMenu = ref(false)

const toggleOptionsMenu = (event: Event) => {
  event.stopPropagation()
  showOptionsMenu.value = !showOptionsMenu.value
}

const closeOptionsMenu = () => {
  showOptionsMenu.value = false
}

const deleteMessage = async (event: Event) => {
  event.stopPropagation()
  if (props.message.mid) {
    await messageStore.deleteLocalMessage(props.message.mid)
    closeOptionsMenu()
  }
}

const copyMessageText = (event: Event) => {
  event.stopPropagation()
  if (props.isTextMessage && props.message.content) {
    try {
      // Use getMessageContent to get the actual message text (handles potential JSON parsing)
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
  if (showOptionsMenu.value && !target.closest('.options-menu') && !target.closest('.message-action-button')) {
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
  <div class="message-actions" :class="{
    'message-actions-left': isOwnMessage,
    'message-actions-right': !isOwnMessage
  }">
    <button class="message-action-button">
      <Reply class="h-4 w-4" />
    </button>
    <div class="relative">
      <button class="message-action-button" @click="toggleOptionsMenu">
        <MoreHorizontal class="h-4 w-4" />
      </button>
      
      <!-- Options menu -->
      <div v-if="showOptionsMenu" 
           class="options-menu" 
           :class="{ 'options-menu-left': isOwnMessage, 'options-menu-right': !isOwnMessage }">
        <button class="options-menu-item" @click="deleteMessage">
          <div class="flex items-center">
            <Trash2 class="h-4 w-4 mr-2" />
            <span>Delete message</span>
          </div>
          <X class="h-4 w-4 options-menu-close" @click.stop="closeOptionsMenu" />
        </button>
        <button v-if="isTextMessage" class="options-menu-item" @click="copyMessageText">
          <div class="flex items-center">
            <Copy class="h-4 w-4 mr-2" />
            <span>Copy message</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-actions {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s ease-in-out;
  z-index: 10;
}

.message-actions-left {
  right: calc(100% + 8px);
}

.message-actions-right {
  left: calc(100% + 8px);
}

.message-action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  transition: background-color 0.15s ease;
  color: white;
  padding: 0;
  border: none;
  cursor: pointer;
}

.message-action-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.options-menu {
  position: absolute;
  top: 0;
  width: 200px;
  background-color: #2A2A2A;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  z-index: 20;
  overflow: hidden;
}

.options-menu-left {
  right: calc(100% - 14px);
}

.options-menu-right {
  left: calc(100% - 14px);
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
  padding: 8px 12px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.options-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>
