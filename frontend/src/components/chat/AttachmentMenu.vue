<template>
  <div class="relative">
    <button 
      type="button" 
      @click="showAttachmentMenu = !showAttachmentMenu"
      class="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
      aria-label="Add attachment"
      :disabled="disabled"
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
        @click="handleAttachment('image')"
        class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left"
        :disabled="disabled"
      >
        <ImageIcon class="h-4 w-4" />
        <span>Image</span>
      </button>
      
      <!-- Document Upload Option -->
      <button 
        @click="handleAttachment('document')"
        class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left"
        :disabled="disabled"
      >
        <FileIcon class="h-4 w-4" />
        <span>Document</span>
      </button>
      
      <!-- Audio Upload Option -->
      <button 
        @click="handleAttachment('audio')"
        class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left"
        :disabled="disabled"
      >
        <Mic class="h-4 w-4" />
        <span>Audio</span>
      </button>
      
      <!-- Code Upload Option -->
      <button 
        @click="handleAttachment('code')"
        class="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left"
        :disabled="disabled"
      >
        <Code class="h-4 w-4" />
        <span>Code</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Paperclip, X, Image as ImageIcon, File as FileIcon, Mic, Code } from "lucide-vue-next"

// When using script setup with TypeScript, we use withDefaults to provide default values
// but we don't need to assign the result to a variable
withDefaults(defineProps<{
  disabled?: boolean
}>(), {
  disabled: false
})

const emit = defineEmits(['select'])
const showAttachmentMenu = ref(false)

function handleAttachment(type: 'image' | 'document' | 'audio' | 'code') {
  emit('select', type)
  showAttachmentMenu.value = false
}
</script>
