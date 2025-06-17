<template>
  <!-- Notification Toast -->
  <transition
    enter-active-class="transform transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transform transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="notification.show" 
         class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-xl max-w-md"
         :class="{
           'bg-red-500 text-white border border-red-700': notification.type === 'error',
           'bg-green-500 text-white border border-green-700': notification.type === 'success',
           'bg-blue-500 text-white border border-blue-700': notification.type === 'info'
         }">
      <div class="flex items-center">
        <!-- Icon -->
        <div class="mr-3 flex-shrink-0">
          <AlertCircle class="h-5 w-5" />
        </div>
        
        <!-- Message -->
        <div class="flex-1 font-medium text-sm">
          {{ notification.message }}
        </div>
        
        <!-- Close button -->
        <button @click="onClose" class="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors">
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { AlertCircle, X } from "lucide-vue-next"
import type { NotificationType } from '@/composables/useNotification'

interface Notification {
  show: boolean
  message: string
  type: NotificationType
  timeout: number | null
}

interface Props {
  notification: Notification
}

defineProps<Props>()
const emit = defineEmits(['close'])

function onClose() {
  emit('close')
}
</script>
