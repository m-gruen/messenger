<script setup lang="ts">
import { ref, defineEmits, nextTick, onMounted } from 'vue'
import { Send, Smile, Image as ImageIcon, File as FileIcon, Mic, Paperclip, X, AlertCircle } from "lucide-vue-next"
import EmojiPicker from './EmojiPicker.vue'
import type { ITextMessageContent, IImageMessageContent, IDocumentMessageContent, IAudioMessageContent } from '@/models/message-model'

const emit = defineEmits(['send'])
const newMessage = ref('')
const showEmojiPicker = ref(false)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const documentInputRef = ref<HTMLInputElement | null>(null)
const audioInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const showAttachmentMenu = ref(false)

// Notification system
const notification = ref({
  show: false,
  message: '',
  type: 'error', // 'error' | 'info' | 'success'
  timeout: null as number | null
})

function showNotification(message: string, type: 'error' | 'info' | 'success' = 'error') {
  // Clear any existing timeout
  if (notification.value.timeout) {
    clearTimeout(notification.value.timeout)
  }
  
  // Set notification
  notification.value = {
    show: true,
    message,
    type,
    timeout: null
  }
  
  // Auto hide after 5 seconds
  notification.value.timeout = window.setTimeout(() => {
    hideNotification()
  }, 5000) as unknown as number
}

function hideNotification() {
  notification.value.show = false
}

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
    showNotification('Please select an image file', 'error')
    return
  }
  
  // Check initial file size
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  if (file.size > MAX_SIZE) {
    showNotification('Image size should not exceed 5MB', 'error')
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
      showNotification('Failed to process the image. Please try a smaller image.', 'error')
      isUploading.value = false;
    });
}

// Handle document upload
function handleDocumentUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  
  if (!files || !files.length) return
  
  const file = files[0]
  
  // Check file size
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE) {
    showNotification('Document size should not exceed 10MB', 'error')
    return
  }
  
  isUploading.value = true
  
  // Read the file as base64
  const reader = new FileReader()
  
  reader.onload = () => {
    const base64Data = reader.result?.toString().split(',')[1] // Get base64 data
    
    if (!base64Data) {
      showNotification('Failed to read document', 'error')
      isUploading.value = false
      return
    }
    
    // Create a document message content object
    const messageContent: IDocumentMessageContent = {
      type: 'document',
      format: file.type,
      content: base64Data,
      name: file.name,
      size: file.size
    }
    
    emit('send', messageContent)
    isUploading.value = false
    
    // Reset file input
    if (documentInputRef.value) {
      documentInputRef.value.value = ''
    }
  }
  
  reader.onerror = () => {
    console.error('Error reading file')
    showNotification('Failed to read document file', 'error')
    isUploading.value = false
  }
  
  reader.readAsDataURL(file)
}

// Handle audio upload
function handleAudioUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  
  if (!files || !files.length) return
  
  const file = files[0]
  
  // Check file size
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  if (file.size > MAX_SIZE) {
    showNotification('Audio size should not exceed 10MB', 'error')
    return
  }
  
  isUploading.value = true
  
  const reader = new FileReader()
  
  reader.onload = () => {
    const base64Data = reader.result?.toString().split(',')[1] // Get base64 data
    
    if (!base64Data) {
      showNotification('Failed to read audio file', 'error')
      isUploading.value = false
      return
    }
    
    // Create an audio message content object
    const messageContent: IAudioMessageContent = {
      type: 'audio',
      format: file.type,
      content: base64Data,
      name: file.name
    }
    
    emit('send', messageContent)
    isUploading.value = false
    
    // Reset file input
    if (audioInputRef.value) {
      audioInputRef.value.value = ''
    }
  }
  
  reader.onerror = () => {
    console.error('Error reading audio file')
    showNotification('Failed to read audio file', 'error')
    isUploading.value = false
  }
  
  reader.readAsDataURL(file)
}

// Trigger file input click
function triggerFileUpload() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// Trigger document file upload
function triggerDocumentUpload() {
  if (documentInputRef.value) {
    documentInputRef.value.click()
  }
}

// Trigger audio file upload
function triggerAudioUpload() {
  if (audioInputRef.value) {
    audioInputRef.value.click()
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
    <!-- Hidden file inputs -->
    <input 
      type="file" 
      ref="fileInputRef" 
      @change="handleImageUpload" 
      accept="image/*" 
      class="hidden"
    />
    
    <input 
      type="file" 
      ref="documentInputRef" 
      @change="handleDocumentUpload" 
      accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip" 
      class="hidden"
    />
    
    <input 
      type="file" 
      ref="audioInputRef" 
      @change="handleAudioUpload" 
      accept="audio/*" 
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
      
      <!-- Attachment Menu Button -->
      <div class="relative">
        <button 
          type="button" 
          @click="showAttachmentMenu = !showAttachmentMenu"
          class="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          aria-label="Add attachment"
          :disabled="isUploading"
        >
          <Paperclip class="h-5 w-5" />
        </button>
        
        <!-- Attachment Menu Popup -->
        <div v-if="showAttachmentMenu" 
          class="absolute bottom-full mb-2 left-0 bg-card border rounded-lg shadow-lg py-1 min-w-[160px]"
        >
          <!-- Close button -->
          <button 
            @click="showAttachmentMenu = false" 
            class="absolute top-1 right-1 p-1 rounded-full hover:bg-muted"
            aria-label="Close attachment menu"
          >
            <X class="h-3 w-3" />
          </button>
          
          <!-- Image Upload Option -->
          <button 
            @click="triggerFileUpload(); showAttachmentMenu = false"
            class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left"
            :disabled="isUploading"
          >
            <ImageIcon class="h-4 w-4" />
            <span>Image</span>
          </button>
          
          <!-- Document Upload Option -->
          <button 
            @click="triggerDocumentUpload(); showAttachmentMenu = false"
            class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left"
            :disabled="isUploading"
          >
            <FileIcon class="h-4 w-4" />
            <span>Document</span>
          </button>
          
          <!-- Audio Upload Option -->
          <button 
            @click="triggerAudioUpload(); showAttachmentMenu = false"
            class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left"
            :disabled="isUploading"
          >
            <Mic class="h-4 w-4" />
            <span>Audio</span>
          </button>
        </div>
      </div>
      
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
          <button @click="hideNotification" class="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors">
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    </transition>
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
