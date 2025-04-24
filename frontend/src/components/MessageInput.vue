<script setup lang="ts">
import { ref, defineEmits } from 'vue'
import { Send } from "lucide-vue-next"

const emit = defineEmits(['send'])
const newMessage = ref('')

function sendMessage() {
  if (!newMessage.value.trim()) return
  
  emit('send', newMessage.value)
  newMessage.value = ''
}
</script>

<template>
  <div class="p-4 border-t bg-card">
    <form @submit.prevent="sendMessage" class="flex items-center gap-2">
      <input v-model="newMessage" type="text" placeholder="Type a message..."
        class="flex-1 rounded-full border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" autofocus />
      <button type="submit" class="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90"
        :disabled="!newMessage.trim()">
        <Send class="h-5 w-5" />
      </button>
    </form>
  </div>
</template>