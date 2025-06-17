<script setup lang="ts">
import { ref } from 'vue';
import KeyRecovery from '@/components/settings/KeyRecovery.vue';

// UI state
const updateError = ref<string | null>(null);
const updateSuccess = ref<string | null>(null);
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

      <!-- Key Management Section -->
      <div class="p-6 border-b dark:border-gray-700">
        <h2 class="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">KEY MANAGEMENT</h2>
        
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Manage your encryption keys used for secure end-to-end encrypted messaging.
        </p>
        
        <!-- Key Recovery Component -->
        <KeyRecovery />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-green-500 {
  background-color: #43B581;
  /* Discord green */
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
