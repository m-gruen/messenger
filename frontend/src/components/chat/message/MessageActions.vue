<script setup lang="ts">
import { Reply, MoreHorizontal } from 'lucide-vue-next'

defineProps<{
  isOwnMessage: boolean
}>()
</script>

<template>
  <div class="message-actions" :class="{
    'message-actions-left': isOwnMessage,
    'message-actions-right': !isOwnMessage
  }">
    <button class="message-action-button">
      <Reply class="h-4 w-4" />
    </button>
    <button class="message-action-button">
      <MoreHorizontal class="h-4 w-4" />
    </button>
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
