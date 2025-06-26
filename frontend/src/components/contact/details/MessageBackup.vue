<script setup lang="ts">
import { ref } from 'vue';
import { Trash2, Download, Upload } from "lucide-vue-next";
import { useAuthStore } from '@/stores/AuthStore';
import { useMessageStore } from '@/stores/MessageStore';
import { indexedDBService } from '@/services/indexeddb.service';
import type { Contact } from '@/models/contact-model';

const props = defineProps({
  contact: {
    type: Object as () => Contact,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  isDeletingMessages: {
    type: Boolean,
    default: false
  },
  isExportingMessages: {
    type: Boolean,
    default: false
  },
  isImportingMessages: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'show-delete-confirmation',
  'action-start',
  'action-complete',
  'action-error'
]);

const authStore = useAuthStore();
const messageStore = useMessageStore();
const fileInputRef = ref<HTMLInputElement | null>(null);

function showDeleteConfirmation() {
  emit('show-delete-confirmation');
}

// Export contact messages
async function exportContactMessages() {
  emit('action-start', 'export');
  
  try {
    if (!authStore.user?.uid) {
      throw new Error("User not authenticated");
    }
    
    // Create a specific key for this contact's messages
    const contactKey = `messages_${authStore.user.uid}_${props.contact.contactUserId}`;
    
    // Get all data from IndexedDB
    const allData = await indexedDBService.exportAllMessages();
    
    // Extract only this contact's messages
    const contactData: Record<string, any> = {};
    if (allData[contactKey]) {
      contactData[contactKey] = allData[contactKey];
    }
    
    // Create the backup data structure
    const backup = {
      version: 2,
      userId: authStore.user.uid,
      contactId: props.contact.contactUserId,
      timestamp: new Date().toISOString(),
      data: contactData
    };
    
    // Create a downloadable file
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages_${props.displayName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up immediately and emit success
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    emit('action-complete', 'Messages exported successfully');
    
  } catch (error: any) {
    emit('action-error', error.message || "Failed to export messages");
    console.error("Error exporting contact messages:", error);
  }
}

function openFileDialog() {
  if (fileInputRef.value) {
    // Clear the input first to ensure change event fires even for the same file
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
}

async function importContactMessages(event: Event) {
  const fileInput = event.target as HTMLInputElement;
  if (!fileInput.files || fileInput.files.length === 0) {
    return;
  }
  
  emit('action-start', 'import');
  
  try {
    const file = fileInput.files[0];
    const text = await file.text();
    const backup = JSON.parse(text);
    
    // Validate backup format
    if (!backup.version || !backup.data) {
      throw new Error("Invalid backup file format");
    }
    
    // Import the messages
    const importedCount = await indexedDBService.importMessages(backup.data);
    
    // Clear the file input
    fileInput.value = '';
    
    // Refresh the messages display if this contact is currently active
    if (messageStore.activeContactId === props.contact.contactUserId) {
      await messageStore.fetchMessages(props.contact.contactUserId);
    }
    
    emit('action-complete', `Successfully imported ${importedCount} conversation(s)`);
  } catch (error: any) {
    emit('action-error', error.message || "Failed to import messages");
    console.error("Error importing contact messages:", error);
  }
}
</script>

<template>
  <div>
    <div class="border-t border-indigo-900/30 pt-3 pb-2">
      <h4 class="text-indigo-100 text-sm font-medium">Message Management</h4>
    </div>
    
    <!-- Delete Messages Button -->
    <div class="relative group mt-3">
      <div class="absolute inset-0 bg-gradient-to-r from-rose-700/20 to-red-800/20 rounded-md blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
      <button 
        @click="showDeleteConfirmation" 
        :disabled="isDeletingMessages || isExportingMessages || isImportingMessages"
        class="relative w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border border-rose-800/50 disabled:opacity-50 text-rose-100 py-3 rounded-md flex justify-center items-center gap-2 shadow-sm transition-all"
      >
        <Trash2 class="h-5 w-5" />
        Delete All Messages
      </button>
    </div>
    
    <!-- Export Messages Button -->
    <div class="relative group mt-3">
      <div class="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-700/20 rounded-md blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
      <button 
        @click="exportContactMessages" 
        :disabled="isDeletingMessages || isExportingMessages || isImportingMessages"
        class="relative w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border border-blue-700/50 disabled:opacity-50 text-blue-100 py-3 rounded-md flex justify-center items-center gap-2 shadow-sm transition-all"
      >
        <Download class="h-5 w-5" />
        <span v-if="isExportingMessages">Exporting...</span>
        <span v-else>Export Messages</span>
      </button>
    </div>
    
    <!-- Import Messages Button -->
    <div class="relative group mt-3">
      <div class="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-700/20 rounded-md blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
      <button 
        @click="openFileDialog" 
        :disabled="isDeletingMessages || isExportingMessages || isImportingMessages"
        class="relative w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border border-emerald-700/50 disabled:opacity-50 text-emerald-100 py-3 rounded-md flex justify-center items-center gap-2 shadow-sm transition-all"
      >
        <Upload class="h-5 w-5" />
        <span v-if="isImportingMessages">Importing...</span>
        <span v-else>Import Messages</span>
      </button>
    </div>
    
    <!-- Hidden file input for importing messages -->
    <input 
      ref="fileInputRef" 
      type="file" 
      accept=".json" 
      class="hidden" 
      @change="importContactMessages"
    />
  </div>
</template>
