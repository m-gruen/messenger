<script setup lang="ts">
import { ref, defineEmits, nextTick, onMounted } from 'vue'
import { Send, Smile, Image as ImageIcon } from "lucide-vue-next"
import EmojiPicker from './EmojiPicker.vue'
import type { ITextMessageContent, IImageMessageContent } from '@/models/message-model'

const emit = defineEmits(['send'])
const newMessage = ref('')
const showEmojiPicker = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

// Send message on form submit
function sendMessage() {
  if (!newMessage.value.trim()) return
  
  // Create a text message content object
  const messageContent: ITextMessageContent = {
    type: 'text',
    content: newMessage.value
  }
  
  emit('send', messageContent)
  newMessage.value = ''
  
  // Reset textarea height after sending
  nextTick(() => {
    if (textareaRef.value) {
      adjustTextareaHeight();
    }
  })
}

// Handle image upload
function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  
  if (!files || !files.length) return
  
  const file = files[0]
  
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file')
    return
  }
  
  // Check initial file size
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  if (file.size > MAX_SIZE) {
    alert('Image size should not exceed 5MB')
    return
  }
  
  isUploading.value = true
  
  // Compress and process image
  compressImage(file)
    .then(compressedDataUrl => {
      // Extract base64 data and format from data URL
      const base64Data = compressedDataUrl.split(',')[1]; // Remove the "data:image/jpeg;base64," part
      const format = compressedDataUrl.split(';')[0].split(':')[1]; // Extract MIME type
      
      // Create an image message content object
      const messageContent: IImageMessageContent = {
        type: 'image',
        format: format,
        content: base64Data
      }
      
      emit('send', messageContent)
      isUploading.value = false
      
      // Reset file input
      if (fileInputRef.value) {
        fileInputRef.value.value = ''
      }
    })
    .catch(error => {
      console.error('Image compression failed:', error);
      alert('Failed to process the image. Please try a smaller image.')
      isUploading.value = false;
    });
}

// Trigger file input click
function triggerFileUpload() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// Compress image to avoid payload too large errors
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create a FileReader to read the file
    const reader = new FileReader();
    
    reader.onload = (event) => {
      // Create an image to calculate dimensions
      const img = new Image();
      
      img.onload = () => {
        // Create a canvas to draw and resize the image
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        // Target width, reduce size if needed
        const MAX_WIDTH = 1280; // Reduced from original if larger
        
        if (width > MAX_WIDTH) {
          const ratio = MAX_WIDTH / width;
          width = MAX_WIDTH;
          height = height * ratio;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw image on canvas with new dimensions
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get the compressed data URL (JPEG format with reduced quality)
        // Using JPEG for better compression
        const quality = 0.7; // 70% quality - good balance between size and quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

// Adjust textarea height based on content
function adjustTextareaHeight() {
  if (!textareaRef.value) return;
  
  // Reset height to auto to get the correct scrollHeight
  textareaRef.value.style.height = 'auto';
  
  // Set new height based on scrollHeight, but capped at 3 lines (~72px)
  const newHeight = Math.min(textareaRef.value.scrollHeight, 72);
  textareaRef.value.style.height = `${newHeight}px`;
}

// Insert emoji at cursor position
function insertEmoji(emoji: string) {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const cursorPos = textarea.selectionStart;
  
  // Insert emoji at cursor position
  const textBeforeCursor = newMessage.value.substring(0, cursorPos);
  const textAfterCursor = newMessage.value.substring(cursorPos);
  newMessage.value = textBeforeCursor + emoji + textAfterCursor;
  
  // Hide picker after selection
  showEmojiPicker.value = false;
  
  // Focus the textarea and set cursor position after the inserted emoji
  nextTick(() => {
    textarea.focus();
    const newCursorPos = cursorPos + emoji.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    
    // Adjust height after emoji insertion
    adjustTextareaHeight();
  });
}

// Handle Shift+Enter for line breaks, Enter to send
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  } else if (e.key === 'Enter' && e.shiftKey) {
    // Let the default behavior add a line break
    nextTick(() => {
      adjustTextareaHeight();
    });
  }
}

// Watch for input changes to adjust height
function handleInput() {
  adjustTextareaHeight();
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value;
}

// Initialize textarea height on mount
onMounted(() => {
  adjustTextareaHeight();
})
</script>

<template>
  <div class="p-4 border-t bg-card relative">
    <!-- Hidden file input -->
    <input 
      type="file" 
      ref="fileInputRef" 
      @change="handleImageUpload" 
      accept="image/*" 
      class="hidden"
    />
    
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
      
      <!-- Image Upload Button -->
      <button 
        type="button" 
        @click="triggerFileUpload"
        class="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
        aria-label="Upload image"
        :disabled="isUploading"
      >
        <ImageIcon class="h-5 w-5" />
      </button>
      
      <!-- Emoji Picker -->
      <EmojiPicker :is-open="showEmojiPicker" @select="insertEmoji" @close="showEmojiPicker = false" />
      
      <!-- Multi-line Textarea (replacing input) -->
      <div class="flex-1 relative">
        <textarea 
          ref="textareaRef"
          v-model="newMessage" 
          @input="handleInput"
          @keydown="handleKeydown"
          placeholder="Type a message..."
          rows="1"
          class="w-full rounded-full border px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary resize-none overflow-y-auto"
          style="min-height: 40px; max-height: 72px;"
          :disabled="isUploading"
        ></textarea>
      </div>
      
      <!-- Send Button -->
      <button 
        type="submit" 
        class="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90"
        :disabled="(!newMessage.trim() && !isUploading) || isUploading"
      >
        <Send class="h-5 w-5" />
      </button>
    </form>
    
    <!-- Loading indicator for image upload -->
    <div v-if="isUploading" class="absolute inset-0 bg-background/50 flex items-center justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling for the textarea */
textarea::-webkit-scrollbar {
  width: 6px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 20px;
  border: transparent;
}

/* For Firefox */
textarea {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
}
</style>
