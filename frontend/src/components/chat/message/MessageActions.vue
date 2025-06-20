<script setup lang="ts">
import { ref } from 'vue'
import { Reply, MoreHorizontal } from 'lucide-vue-next'
import type { IMessage } from '@/models/message-model'
import MessageOptionsMenu from './MessageOptionsMenu.vue'

const { isOwnMessage, message, isTextMessage } = defineProps<{
  isOwnMessage: boolean,
  message: IMessage,
  isTextMessage: boolean
}>()

const showOptionsMenu = ref(false)
const optionsButtonRef = ref<HTMLElement | null>(null)
const buttonRect = ref<DOMRect | null>(null)

const toggleOptionsMenu = (event: Event) => {
  event.stopPropagation()
  if (!showOptionsMenu.value) {
    // Get the options button's position when opening the menu
    if (optionsButtonRef.value) {
      buttonRect.value = optionsButtonRef.value.getBoundingClientRect()
    }
  }
  showOptionsMenu.value = !showOptionsMenu.value
}

const closeOptionsMenu = () => {
  showOptionsMenu.value = false
}
</script>

<template>
  <div class="message-actions" :class="{
    'message-actions-left': isOwnMessage,
    'message-actions-right': !isOwnMessage
  }">
    <button class="message-action-button">
      <Reply class="h-4 w-4" />
    </button>
    <button 
      ref="optionsButtonRef" 
      class="message-action-button" 
      @click="toggleOptionsMenu">
      <MoreHorizontal class="h-4 w-4" />
    </button>
    
    <!-- Options menu is now a separate component -->
    <MessageOptionsMenu 
      v-if="showOptionsMenu"
      :is-open="showOptionsMenu"
      :message="message"
      :is-text-message="isTextMessage"
      :anchor-rect="buttonRect"
      :is-own-message="isOwnMessage"
      @close="closeOptionsMenu"
    />
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
</style>
