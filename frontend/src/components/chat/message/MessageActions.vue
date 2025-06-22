<script setup lang="ts">
import { ref } from 'vue'
import { Reply, MoreHorizontal } from 'lucide-vue-next'
import type { IMessage } from '@/models/message-model'
import MessageOptionsMenu from './MessageOptionsMenu.vue'
import ForwardDialog from '@/components/ForwardDialog.vue'

const { isOwnMessage, message, isTextMessage } = defineProps<{
  isOwnMessage: boolean,
  message: IMessage,
  isTextMessage: boolean
}>()

const emit = defineEmits<{
  'reply': [message: IMessage]
}>()

const showOptionsMenu = ref(false)
const showForwardDialog = ref(false)
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

const handleReply = (event: Event) => {
  event.stopPropagation()
  emit('reply', message)
}

const handleForward = (_forwardMessage: IMessage) => {
  showForwardDialog.value = true
}

const handleForwardComplete = (contactIds: number[]) => {
  console.log(`Message forwarded to ${contactIds.length} contacts`)
}
</script>

<template>
  <div class="message-actions" :class="{
    'message-actions-left': isOwnMessage,
    'message-actions-right': !isOwnMessage
  }">
    <!-- For own messages: Options first, then Reply -->
    <template v-if="isOwnMessage">
      <button 
        ref="optionsButtonRef" 
        class="message-action-button" 
        @click="toggleOptionsMenu">
        <MoreHorizontal class="h-4 w-4" />
      </button>
      <button 
        class="message-action-button"
        @click="handleReply">
        <Reply class="h-4 w-4" />
      </button>
    </template>
    
    <!-- For other users' messages: Reply first, then Options (original order) -->
    <template v-else>
      <button 
        class="message-action-button"
        @click="handleReply">
        <Reply class="h-4 w-4" />
      </button>
      <button 
        ref="optionsButtonRef" 
        class="message-action-button" 
        @click="toggleOptionsMenu">
        <MoreHorizontal class="h-4 w-4" />
      </button>
    </template>
    
    <!-- Options menu is now a separate component -->
    <MessageOptionsMenu 
      v-if="showOptionsMenu"
      :is-open="showOptionsMenu"
      :message="message"
      :is-text-message="isTextMessage"
      :anchor-rect="buttonRect"
      :is-own-message="isOwnMessage"
      @close="closeOptionsMenu"
      @forward="handleForward"
    />
    
    <!-- Forward Dialog -->
    <ForwardDialog
      v-model:show="showForwardDialog"
      :message="message"
      @forward="handleForwardComplete"
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
  background-color: rgba(79, 70, 229, 0.3);
  border: 1px solid rgba(99, 102, 241, 0.3);
  transition: all 0.15s ease;
  color: rgba(224, 231, 255, 0.9);
  padding: 0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  cursor: pointer;
}

.message-action-button:hover {
  background-color: rgba(99, 102, 241, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
}
</style>
