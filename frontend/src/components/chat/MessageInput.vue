<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Send, Smile } from "lucide-vue-next"
import EmojiPicker from './EmojiPicker.vue'
import ReplyIndicator from './ReplyIndicator.vue'
import AttachmentMenu from './AttachmentMenu.vue'

import { useToast } from '@/composables/useToast'
import { useFileUpload } from '@/composables/useFileUpload'
import { useFileHandler } from '@/composables/useFileHandler'
import { useTextareaHandler } from '@/composables/useTextareaHandler'

import type { ITextMessageContent, IMessage } from '@/models/message-model'
// messageContentService is now used in ReplyIndicator component

const props = defineProps({
  replyTo: {
    type: Object as () => { message: IMessage } | null,
    default: null
  },
  currentUserId: {
    type: Number,
    default: undefined
  },
  contact: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['send', 'cancelReply'])

// Use composables
const { showToast, showError, showInfo, showSuccess } = useToast()
const { fileInputRef, documentInputRef, audioInputRef, codeInputRef, compressImage, getLanguageFromExtension } = useFileUpload()
const { textareaRef, message, adjustTextareaHeight, handleKeydown, handleInput, insertTextAtCursor, resetTextarea } = useTextareaHandler()
const { isUploading, handleImageUpload, handleDocumentUpload, handleAudioUpload, handleCodeUpload } = useFileHandler((message: string, type: string) => {
  switch (type) {
    case 'error':
      showError(message)
      break
    case 'info':
      showInfo(message)
      break
    case 'success':
      showSuccess(message)
      break
    default:
      showToast(message, 'info')
  }
})

// Local state
const showEmojiPicker = ref(false)

// Send message on form submit
function sendMessage() {
  if (!message.value.trim()) return
  
  // Create a text message content object
  const messageContent: ITextMessageContent = {
    type: 'text',
    content: message.value
  }
  
  emit('send', messageContent)
  resetTextarea()
  
  // If we were replying, cancel the reply after sending
  if (props.replyTo) {
    emit('cancelReply')
  }
}

// Handle emoji picker
function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value
}

function insertEmoji(emoji: string) {
  insertTextAtCursor(emoji)
  showEmojiPicker.value = false
}

// Attachment menu handlers
function handleAttachment(type: 'image' | 'document' | 'audio' | 'code') {
  // Prevent file uploads during replies
  if (props.replyTo) {
    showInfo('Attachments are disabled when replying to a message')
    return
  }
  
  switch (type) {
    case 'image':
      if (fileInputRef.value) fileInputRef.value.click()
      break
    case 'document':
      if (documentInputRef.value) documentInputRef.value.click()
      break
    case 'audio':
      if (audioInputRef.value) audioInputRef.value.click()
      break
    case 'code':
      if (codeInputRef.value) codeInputRef.value.click()
      break
  }
}

// Initialize textarea height on mount
onMounted(() => {
  adjustTextareaHeight()
})
</script>

<template>
  <div class="p-4 border-t border-indigo-900/30 bg-gradient-to-b from-slate-900 to-slate-800 relative">
    <!-- Reply Indicator - shown when replying to a message -->
    <ReplyIndicator 
      v-if="props.replyTo" 
      :replyTo="props.replyTo" 
      :currentUserId="props.currentUserId" 
      :contactName="props.contact.display_name || props.contact.username"
      @cancelReply="emit('cancelReply')" 
    />
    
    <!-- Hidden file inputs -->
    <input 
      type="file" 
      ref="fileInputRef" 
      @change="(e) => handleImageUpload(
        e,
        compressImage,
        (content) => emit('send', content),
        () => {}
      )" 
      accept="image/*" 
      class="hidden"
    />
    
    <input 
      type="file" 
      ref="documentInputRef" 
      @change="(e) => handleDocumentUpload(
        e,
        (content) => emit('send', content),
        () => {}
      )" 
      accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip" 
      class="hidden"
    />
    
    <input 
      type="file" 
      ref="audioInputRef" 
      @change="(e) => handleAudioUpload(
        e,
        (content) => emit('send', content),
        () => {}
      )" 
      accept="audio/*" 
      class="hidden"
    />
    
    <input 
      type="file" 
      ref="codeInputRef" 
      @change="(e) => handleCodeUpload(
        e,
        getLanguageFromExtension,
        (content) => emit('send', content),
        () => {}
      )" 
      accept=".js,.ts,.py,.java,.html,.css,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.sh,.bash,.bat,.ps1,.sql,.json,.xml,.md,.jsx,.tsx,.vue,.txt" 
      class="hidden"
    />
    
    <form @submit.prevent="sendMessage" class="flex items-center gap-2">
      <!-- Emoji Button -->
      <button 
        type="button" 
        @click="toggleEmojiPicker"
        class="p-2 text-indigo-300/80 hover:text-indigo-100 rounded-full hover:bg-slate-700/60 transition-colors"
        aria-label="Open emoji picker"
      >
        <Smile class="h-5 w-5" />
      </button>
      
      <!-- Attachment Menu -->
      <AttachmentMenu 
        :disabled="isUploading || !!props.replyTo" 
        @select="handleAttachment"
      />
      
      <!-- Emoji Picker -->
      <EmojiPicker :is-open="showEmojiPicker" @select="insertEmoji" @close="showEmojiPicker = false" />
      
      <!-- Multi-line Textarea with gradient border effect -->
      <div class="flex-1 relative">
        <div class="absolute inset-0 bg-gradient-to-r from-indigo-600/40 to-blue-600/40 rounded-full blur opacity-30"></div>
        <textarea 
          ref="textareaRef"
          v-model="message" 
          @input="handleInput"
          @keydown="(e) => handleKeydown(e, sendMessage)"
          placeholder="Type a message..."
          rows="1"
          class="relative w-full rounded-full bg-slate-800/90 border border-indigo-500/30 px-4 py-2 pr-10 text-indigo-100 placeholder:text-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none overflow-y-auto"
          style="min-height: 40px; max-height: 72px;"
          :disabled="isUploading"
        ></textarea>
      </div>
      
      <!-- Send Button -->
      <div class="relative">
        <div class="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full blur opacity-30 group-hover:opacity-50"></div>
        <button 
          type="submit" 
          class="relative rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 p-2 text-white shadow-md transition-all duration-200"
          :disabled="(!message.trim() && !isUploading) || isUploading"
        >
          <Send class="h-5 w-5" />
        </button>
      </div>
    </form>
    
    <!-- Loading indicator for image upload -->
    <div v-if="isUploading" class="absolute inset-0 bg-slate-900/70 flex items-center justify-center backdrop-blur-sm">
      <div class="flex flex-col items-center">
        <div class="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mb-2"></div>
        <div class="text-indigo-100 font-medium">Uploading...</div>
      </div>
    </div>
    
    <!-- Notification Toasts are now handled globally through App.vue -->
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
  background-color: rgba(129, 140, 248, 0.4);
  border-radius: 20px;
  border: transparent;
}

/* For Firefox */
textarea {
  scrollbar-width: thin;
  scrollbar-color: rgba(129, 140, 248, 0.4) transparent;
}
</style>
