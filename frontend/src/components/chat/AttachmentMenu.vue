<template>
  <div class="relative">
    <button 
      type="button" 
      @click="showAttachmentMenu = !showAttachmentMenu"
      class="p-2 text-indigo-300/80 hover:text-indigo-100 rounded-full hover:bg-slate-700/60 transition-colors"
      aria-label="Add attachment"
      :disabled="disabled"
    >
      <Paperclip class="h-5 w-5" />
    </button>
    
    <!-- Attachment Menu Popup -->
    <div v-if="showAttachmentMenu" 
      class="absolute bottom-full mb-2 left-0 bg-slate-800/90 border border-indigo-900/40 rounded-lg shadow-xl py-1.5 min-w-[180px] z-50"
    >
      <!-- Close button -->
      <button 
        @click="showAttachmentMenu = false" 
        class="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-slate-700/70 text-indigo-300/80 hover:text-indigo-100 transition-colors"
        aria-label="Close attachment menu"
      >
        <X class="h-3 w-3" />
      </button>
      
      <!-- Image Upload Option -->
      <button 
        @click="handleAttachment('image')"
        class="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-700/70 text-indigo-100 text-left transition-colors"
        :disabled="disabled"
      >
        <div class="bg-blue-900/40 p-1 rounded-md">
          <ImageIcon class="h-4 w-4 text-blue-400" />
        </div>
        <span>Image</span>
      </button>
      
      <!-- Document Upload Option -->
      <button 
        @click="handleAttachment('document')"
        class="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-700/70 text-indigo-100 text-left transition-colors"
        :disabled="disabled"
      >
        <div class="bg-purple-900/40 p-1 rounded-md">
          <FileIcon class="h-4 w-4 text-purple-400" />
        </div>
        <span>Document</span>
      </button>
      
      <!-- Audio Upload Option -->
      <button 
        @click="handleAttachment('audio')"
        class="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-700/70 text-indigo-100 text-left transition-colors"
        :disabled="disabled"
      >
        <div class="bg-emerald-900/40 p-1 rounded-md">
          <Mic class="h-4 w-4 text-emerald-400" />
        </div>
        <span>Audio</span>
      </button>
      
      <!-- Code Upload Option -->
      <button 
        @click="handleAttachment('code')"
        class="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-slate-700/70 text-indigo-100 text-left transition-colors"
        :disabled="disabled"
      >
        <div class="bg-indigo-900/40 p-1 rounded-md">
          <Code class="h-4 w-4 text-indigo-400" />
        </div>
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
