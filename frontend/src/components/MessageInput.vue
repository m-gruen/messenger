<script setup lang="ts">
import { ref, defineEmits, nextTick } from 'vue'
import { Send, Smile } from "lucide-vue-next"
import EmojiPicker from './EmojiPicker.vue'

const emit = defineEmits(['send'])
const newMessage = ref('')
const showEmojiPicker = ref(false)

function sendMessage() {
  if (!newMessage.value.trim()) return
  
  emit('send', newMessage.value)
  newMessage.value = ''
}

// Insert emoji at cursor position or append to end
function insertEmoji(emoji: string) {
  const textarea = document.querySelector('input[type="text"]') as HTMLInputElement;
  const cursorPos = textarea?.selectionStart ?? newMessage.value.length;
  
  // Insert emoji at cursor position
  const textBeforeCursor = newMessage.value.substring(0, cursorPos);
  const textAfterCursor = newMessage.value.substring(cursorPos);
  newMessage.value = textBeforeCursor + emoji + textAfterCursor;
  
  // Hide picker after selection
  showEmojiPicker.value = false;
  
  // Focus the input and set cursor position after the inserted emoji
  nextTick(() => {
    textarea?.focus();
    const newCursorPos = cursorPos + emoji.length;
    textarea?.setSelectionRange(newCursorPos, newCursorPos);
  });
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value;
}
</script>

<template>
  <div class="p-4 border-t bg-card relative">
    <form @submit.prevent="sendMessage" class="flex items-center gap-2">
      <!-- Emoji Button -->
      <button 
        type="button" 
        @click="toggleEmojiPicker"
        class="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
        aria-label="Open emoji picker"
      >
        <Smile class="h-5 w-5" />
      </button>
      
      <!-- Emoji Picker -->
      <EmojiPicker :is-open="showEmojiPicker" @select="insertEmoji" @close="showEmojiPicker = false" />
      
      <!-- Input Field -->
      <input v-model="newMessage" type="text" placeholder="Type a message..."
        class="flex-1 rounded-full border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" autofocus />
      
      <!-- Send Button -->
      <button type="submit" class="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90"
        :disabled="!newMessage.trim()">
        <Send class="h-5 w-5" />
      </button>
    </form>
  </div>
</template>