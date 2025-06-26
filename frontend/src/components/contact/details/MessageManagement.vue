<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Trash2, Download, Upload, HardDrive } from "lucide-vue-next";
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
  showDeleteMessagesConfirmation: {
    type: Boolean,
    default: false
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
  'delete-messages', 
  'show-delete-confirmation', 
  'hide-confirmations',
  'action-start',
  'action-complete',
  'action-error'
]);

const authStore = useAuthStore();
const messageStore = useMessageStore();
const fileInputRef = ref<HTMLInputElement | null>(null);

// Storage usage state
const storageUsage = ref<{
  bytesUsed: number;
  messagesCount: number;
  isLoading: boolean;
}>({
  bytesUsed: 0,
  messagesCount: 0,
  isLoading: false
});

// Load storage usage for this specific contact
async function loadContactStorageUsage() {
  if (!authStore.user?.uid) return;
  
  storageUsage.value.isLoading = true;
  
  try {
    const contactUsage = await indexedDBService.getStorageUsageByContact(authStore.user.uid);
    const thisContactUsage = contactUsage.find(usage => usage.contactId === props.contact.contactUserId);
    
    if (thisContactUsage) {
      storageUsage.value.bytesUsed = thisContactUsage.bytesUsed;
      storageUsage.value.messagesCount = thisContactUsage.messagesCount;
    } else {
      storageUsage.value.bytesUsed = 0;
      storageUsage.value.messagesCount = 0;
    }
  } catch (error) {
    console.error('Failed to load contact storage usage:', error);
    storageUsage.value.bytesUsed = 0;
    storageUsage.value.messagesCount = 0;
  } finally {
    storageUsage.value.isLoading = false;
  }
}

// Format bytes to human-readable format
function formatBytes(bytes: number): string {
  return indexedDBService.formatBytes(bytes);
}

// Load storage data when component mounts
onMounted(loadContactStorageUsage);

// Watch for contact changes and reload storage usage
watch(() => props.contact?.contactUserId, loadContactStorageUsage);

function showDeleteConfirmation() {
  emit('show-delete-confirmation');
}

function confirmDeleteMessages() {
  deleteContactMessages();
}

// Delete contact messages
async function deleteContactMessages() {
  emit('action-start', 'delete');
  
  try {
    // Use the message store function to delete messages for this contact
    const success = await messageStore.deleteContactMessages(props.contact.contactUserId);
    
    if (success) {
      emit('action-complete', 'Messages deleted successfully');
      // Refresh storage usage after deletion
      await loadContactStorageUsage();
    } else {
      emit('action-error', 'Failed to delete messages');
    }
  } catch (error: any) {
    emit('action-error', error.message || "An error occurred while deleting messages");
    console.error("Error deleting contact messages:", error);
  } finally {
    emit('hide-confirmations');
  }
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
    // Refresh storage usage after import
    await loadContactStorageUsage();
  } catch (error: any) {
    emit('action-error', error.message || "Failed to import messages");
    console.error("Error importing contact messages:", error);
  }
}
</script>

<template>
  <!-- Delete Messages Confirmation -->
  <div v-if="showDeleteMessagesConfirmation" class="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
    <p class="text-white text-center mb-2">Are you sure you want to delete all messages with this contact?</p>
    <p class="text-indigo-200/70 text-sm text-center mb-4">This will delete all message history with this contact from your device. This action cannot be undone.</p>
    <div class="flex justify-center gap-4">
      <button 
        @click="confirmDeleteMessages" 
        :disabled="isDeletingMessages" 
        class="bg-gradient-to-r from-rose-800 to-red-900 hover:from-rose-700 hover:to-red-800 disabled:opacity-50 text-white py-2 px-6 rounded-md shadow-sm transition-all duration-200"
      >
        <span v-if="isDeletingMessages">Deleting...</span>
        <span v-else>Confirm</span>
      </button>
      <button 
        @click="$emit('hide-confirmations')" 
        :disabled="isDeletingMessages"
        class="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 py-2 px-6 rounded-md shadow-sm transition-all"
      >
        Cancel
      </button>
    </div>
  </div>
  
  <!-- Message Management Buttons -->
  <div v-else>
    <div class="border-t border-indigo-900/30 pt-3 pb-2 mb-4">
      <h4 class="text-indigo-100 text-sm font-medium">Message Storage</h4>
    </div>
    
    <!-- Storage Usage Overview -->
    <div class="bg-gradient-to-r from-slate-800/70 to-slate-900/70 rounded-lg border border-indigo-900/30 p-4 mb-5 shadow-sm">
      <div class="flex items-center gap-2 mb-3">
        <div class="bg-indigo-900/30 p-1.5 rounded-md">
          <HardDrive class="h-4 w-4 text-indigo-300" />
        </div>
        <h4 class="text-indigo-100 text-sm font-medium">Storage Usage</h4>
      </div>
      
      <div v-if="storageUsage.isLoading" class="flex items-center justify-center py-4">
        <div class="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
        <span class="ml-2 text-sm text-indigo-300/70">Loading...</span>
      </div>
      
      <div v-else class="space-y-2.5">
        <div class="flex items-center justify-between text-sm">
          <span class="text-indigo-300/70">Storage Used:</span>
          <span class="text-white font-medium bg-indigo-900/30 px-2 py-0.5 rounded-md">{{ formatBytes(storageUsage.bytesUsed) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-indigo-300/70">Messages:</span>
          <span class="text-white font-medium bg-indigo-900/30 px-2 py-0.5 rounded-md">{{ storageUsage.messagesCount.toLocaleString() }}</span>
        </div>
        <div v-if="storageUsage.messagesCount === 0" class="text-xs text-indigo-300/50 text-center py-1 rounded-md bg-indigo-900/20 mt-1">
          No messages stored for this contact
        </div>
      </div>
    </div>
    
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
