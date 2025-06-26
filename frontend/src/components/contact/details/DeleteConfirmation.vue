<script setup lang="ts">
import { useMessageStore } from '@/stores/MessageStore';
import type { Contact } from '@/models/contact-model';

const props = defineProps({
  contact: {
    type: Object as () => Contact,
    required: true
  },
  show: {
    type: Boolean,
    default: false
  },
  isDeleting: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'hide-confirmations',
  'action-start',
  'action-complete',
  'action-error'
]);

const messageStore = useMessageStore();

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
</script>

<template>
  <!-- Delete Messages Confirmation -->
  <div v-if="show" class="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
    <p class="text-white text-center mb-2">Are you sure you want to delete all messages with this contact?</p>
    <p class="text-indigo-200/70 text-sm text-center mb-4">This will delete all message history with this contact from your device. This action cannot be undone.</p>
    <div class="flex justify-center gap-4">
      <button 
        @click="confirmDeleteMessages" 
        :disabled="isDeleting" 
        class="bg-gradient-to-r from-rose-800 to-red-900 hover:from-rose-700 hover:to-red-800 disabled:opacity-50 text-white py-2 px-6 rounded-md shadow-sm transition-all duration-200"
      >
        <span v-if="isDeleting">Deleting...</span>
        <span v-else>Confirm</span>
      </button>
      <button 
        @click="$emit('hide-confirmations')" 
        :disabled="isDeleting"
        class="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 py-2 px-6 rounded-md shadow-sm transition-all"
      >
        Cancel
      </button>
    </div>
  </div>
</template>
