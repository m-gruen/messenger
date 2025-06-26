<script setup lang="ts">
import { ref } from 'vue';
import type { Contact } from '@/models/contact-model';

// Import child components
import StorageUsage from './StorageUsage.vue';
import MessageBackup from './MessageBackup.vue';
import DeleteConfirmation from './DeleteConfirmation.vue';

defineProps({
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

// Component refs
const storageUsageRef = ref<InstanceType<typeof StorageUsage> | null>(null);

// Action state management
const isDeletingMessages = ref(false);
const isExportingMessages = ref(false);
const isImportingMessages = ref(false);

// Handle action start events
function handleActionStart(action: string) {
  if (action === 'delete') isDeletingMessages.value = true;
  else if (action === 'export') isExportingMessages.value = true;
  else if (action === 'import') isImportingMessages.value = true;
  
  emit('action-start', action);
}

// Handle action complete events
function handleActionComplete(message: string) {
  resetActionStates();
  
  // Refresh storage usage after actions that modify data
  if (storageUsageRef.value) {
    storageUsageRef.value.refreshStorageUsage();
  }
  
  emit('action-complete', message);
}

// Handle action error events
function handleActionError(error: string) {
  resetActionStates();
  emit('action-error', error);
}

// Reset all action states
function resetActionStates() {
  isDeletingMessages.value = false;
  isExportingMessages.value = false;
  isImportingMessages.value = false;
}

// Handle show delete confirmation
function handleShowDeleteConfirmation() {
  emit('show-delete-confirmation');
}

// Handle hide confirmations
function handleHideConfirmations() {
  emit('hide-confirmations');
}
</script>

<template>
  <!-- Delete Messages Confirmation -->
  <DeleteConfirmation
    v-if="showDeleteMessagesConfirmation"
    :contact="contact"
    :show="showDeleteMessagesConfirmation"
    :is-deleting="isDeletingMessages"
    @hide-confirmations="handleHideConfirmations"
    @action-start="handleActionStart"
    @action-complete="handleActionComplete"
    @action-error="handleActionError"
  />
  
  <!-- Message Management Content -->
  <div v-else>
    <!-- Storage Usage Component -->
    <StorageUsage
      ref="storageUsageRef"
      :contact="contact"
    />
    
    <!-- Message Actions Component -->
    <MessageBackup
      :contact="contact"
      :display-name="displayName"
      :is-deleting-messages="isDeletingMessages"
      :is-exporting-messages="isExportingMessages"
      :is-importing-messages="isImportingMessages"
      @show-delete-confirmation="handleShowDeleteConfirmation"
      @action-start="handleActionStart"
      @action-complete="handleActionComplete"
      @action-error="handleActionError"
    />
  </div>
</template>
