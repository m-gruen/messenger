<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { HardDrive } from "lucide-vue-next";
import { useAuthStore } from '@/stores/AuthStore';
import { indexedDBService } from '@/services/indexeddb.service';
import type { Contact } from '@/models/contact-model';

const props = defineProps({
  contact: {
    type: Object as () => Contact,
    required: true
  }
});

const authStore = useAuthStore();

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

// Expose function to refresh storage usage (for parent components)
defineExpose({
  refreshStorageUsage: loadContactStorageUsage
});
</script>

<template>
  <div>
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
  </div>
</template>
