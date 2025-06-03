<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@/components/ui/button';

enum StorageType {
  RAM = 'ram',
  SERVER = 'server',
  FILE = 'file'
}

// Form fields
const storageType = ref(StorageType.SERVER);

// UI state
const isUpdating = ref(false);
const updateError = ref<string | null>(null);
const updateSuccess = ref<string | null>(null);

async function updateStorageSettings(): Promise<void> {
  try {
    isUpdating.value = true;
    updateError.value = null;

    updateSuccess.value = "Storage settings updated successfully";
    isUpdating.value = false;
  } catch (error: any) {
    updateError.value = error.message || "An unexpected error occurred";
    isUpdating.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Main content -->
    <div class="bg-card rounded-lg shadow-md">
      <!-- Error/Success Messages -->
      <div v-if="updateError"
        class="p-4 mb-4 bg-destructive/10 text-destructive border-l-4 border-destructive rounded">
        {{ updateError }}
      </div>
      <div v-if="updateSuccess"
        class="p-4 mb-4 bg-green-100 dark:bg-green-900/10 text-green-800 dark:text-green-400 border-l-4 border-green-500 rounded">
        {{ updateSuccess }}
      </div>

      <!-- Message Storage Settings Section -->
      <div class="p-6 border-b dark:border-gray-700">
        <h2 class="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">MESSAGE STORAGE</h2>

        <!-- Storage Type Selection -->
        <div class="space-y-2">
          <label for="storage-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Message Storage
            Type</label>
          <select id="storage-type" v-model="storageType"
            class="w-full rounded-md border-2 border-gray-300 dark:border-gray-500 bg-white
             dark:bg-gray-700 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900
             dark:text-gray-100">
            <option value="ram">RAM Storage</option>
            <option value="server">Server Storage</option>
            <option value="file">File Storage</option>
          </select>

          <!-- Description based on selection -->
          <div
            class="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100
            dark:bg-gray-700/50 p-3 rounded border border-gray-200 dark:border-gray-600">
            <p v-if="storageType === 'ram'">
              RAM Storage: Messages are only stored in memory and will be deleted when you log out. Most secure option
              but messages are not persistent.
            </p>
            <p v-else-if="storageType === 'server'">
              Server Storage: Messages are stored securely on the server. Provides message history across devices but
              requires server trust.
            </p>
            <p v-else-if="storageType === 'file'">
              File Storage: Messages are stored locally in encrypted files. Offers persistence without server storage,
              but only available on current device.
            </p>
          </div>
        </div>
      </div>

      <!-- Save changes button -->
      <div class="p-6 border-t border-border">
        <Button 
          variant="default" 
          @click="updateStorageSettings" 
          :disabled="isUpdating"
        >
          <span v-if="isUpdating">Saving...</span>
          <span v-else>Save Changes</span>
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-green-500 {
  background-color: #43B581;
  /* Discord green */
}

/* Switch animation */
.transform {
  transition: transform 150ms ease-in-out;
}

/* Input field styling */
input,
select {
  border-width: 2px !important;
}

.dark input,
.dark select {
  color: white !important;
  background-color: #2D3748 !important;
}

/* Remove extra margins to prevent unexpected spacing */
.max-w-3xl {
  margin-top: 0;
}
</style>

