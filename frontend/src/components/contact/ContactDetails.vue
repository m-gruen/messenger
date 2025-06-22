<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { X } from "lucide-vue-next";
import type { Contact } from '@/models/contact-model';
import { useAuthStore } from '@/stores/AuthStore';
import { useMessageStore } from '@/stores/MessageStore';
import { apiService } from '@/services/api.service';
import type { User } from '@/models/user-model';

// Import child components
import ContactInfo from './details/ContactInfo.vue';
import ContactActions from './details/ContactActions.vue';
import MessageManagement from './details/MessageManagement.vue';

const props = defineProps({
  contact: {
    type: Object as () => Contact,
    required: true
  },
  show: {
    type: Boolean,
    default: false
  },
  isRemoving: {
    type: Boolean,
    default: false
  },
  isBlocking: {
    type: Boolean,
    default: false
  },
  isUnblocking: {
    type: Boolean,
    default: false
  },
  actionError: {
    type: String,
    default: undefined
  },
  removalSuccess: {
    type: Boolean,
    default: false
  },
  blockSuccess: {
    type: Boolean,
    default: false
  },
  unblockSuccess: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'remove', 'cancel-remove', 'block', 'unblock']);

// State
const authStore = useAuthStore();
const messageStore = useMessageStore();
const user = ref<User | null>(null);

// Confirmation dialogs state
const showRemoveConfirmation = ref(false);
const showBlockConfirmation = ref(false);
const showUnblockConfirmation = ref(false);
const showDeleteMessagesConfirmation = ref(false);

// Message action states
const isDeletingMessages = ref(false);
const isExportingMessages = ref(false);
const isImportingMessages = ref(false);
const messageActionSuccess = ref<string | null>(null);
const messageActionError = ref<string | null>(null);

// Fetch contact user data
async function fetchContactUser() {
  if (props.contact && props.contact.contactUserId && authStore.user?.token) {
    try {
      user.value = await apiService.getUserById(props.contact.contactUserId, authStore.user.token);
    } catch (e) {
      user.value = null;
    }
  }
}

onMounted(fetchContactUser);
watch(() => props.contact?.contactUserId, fetchContactUser);

// Contact actions
function handleRemove() {
  emit('remove');
  showRemoveConfirmation.value = false;
}

function handleCancelRemove() {
  showRemoveConfirmation.value = false;
  emit('cancel-remove');
}

function handleBlock() {
  emit('block');
  showBlockConfirmation.value = false;
}

function handleUnblock() {
  emit('unblock');
  showUnblockConfirmation.value = false;
}

function showRemoveDialog() {
  showRemoveConfirmation.value = true;
  hideOtherDialogs('remove');
}

function showBlockDialog() {
  showBlockConfirmation.value = true;
  hideOtherDialogs('block');
}

function showUnblockDialog() {
  showUnblockConfirmation.value = true;
  hideOtherDialogs('unblock');
}

function showDeleteMessagesDialog() {
  showDeleteMessagesConfirmation.value = true;
  hideOtherDialogs('deleteMessages');
}

function hideAllDialogs() {
  showRemoveConfirmation.value = false;
  showBlockConfirmation.value = false;
  showUnblockConfirmation.value = false;
  showDeleteMessagesConfirmation.value = false;
}

function hideOtherDialogs(except: string) {
  if (except !== 'remove') showRemoveConfirmation.value = false;
  if (except !== 'block') showBlockConfirmation.value = false;
  if (except !== 'unblock') showUnblockConfirmation.value = false;
  if (except !== 'deleteMessages') showDeleteMessagesConfirmation.value = false;
}

// Handle message action events
function handleActionStart(action: string | null) {
  messageActionSuccess.value = null;
  messageActionError.value = null;
  
  if (action === 'delete') isDeletingMessages.value = true;
  else if (action === 'export') isExportingMessages.value = true;
  else if (action === 'import') isImportingMessages.value = true;
  else {
    isDeletingMessages.value = false;
    isExportingMessages.value = false;
    isImportingMessages.value = false;
  }
}

function handleActionComplete(message: string) {
  messageActionSuccess.value = message;
  isDeletingMessages.value = false;
  isExportingMessages.value = false;
  isImportingMessages.value = false;
}

function handleActionError(error: string) {
  messageActionError.value = error;
  isDeletingMessages.value = false;
  isExportingMessages.value = false;
  isImportingMessages.value = false;
}
</script>

<template>
  <div v-if="show"
    class="fixed top-0 right-0 bottom-0 z-10 w-80 bg-black overflow-y-auto transform transition-all duration-300 ease-in-out shadow-xl">
    <!-- Header with Close Button -->
    <div class="p-4 border-b border-border">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-semibold text-white">Contact Details</h2>
        <button @click="emit('close')" class="rounded-full p-1 hover:bg-accent/20">
          <X class="h-6 w-6 text-white" />
        </button>
      </div>
      <p class="text-sm text-muted-foreground mt-1">View and manage contact details</p>
    </div>

    <!-- Contact Info Component -->
    <ContactInfo :contact="props.contact" :user="user" />

    <!-- Divider -->
    <div class="border-t border-border mx-4 my-2"></div>

    <!-- Actions Section -->
    <div class="px-4 py-6 space-y-4">
      <!-- Error/Success Messages -->
      <div v-if="props.actionError" class="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
        {{ props.actionError }}
      </div>

      <div v-if="messageActionError" class="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
        {{ messageActionError }}
      </div>

      <div v-if="props.blockSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact blocked successfully!
      </div>

      <div v-if="props.unblockSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact unblocked successfully!
      </div>

      <div v-if="props.removalSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact removed successfully!
      </div>
      
      <div v-if="messageActionSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        {{ messageActionSuccess }}
      </div>

      <!-- Loading Indicators -->
      <div v-if="props.isRemoving || props.isBlocking || props.isUnblocking || isDeletingMessages || isExportingMessages || isImportingMessages" 
        class="flex justify-center items-center mb-4">
        <div class="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full"></div>
        <span class="ml-2 text-white">
          {{ props.isRemoving ? 'Removing contact...' : 
             props.isBlocking ? 'Blocking contact...' : 
             props.isUnblocking ? 'Unblocking contact...' :
             isDeletingMessages ? 'Deleting messages...' :
             isExportingMessages ? 'Exporting messages...' : 'Importing messages...' }}
        </span>
      </div>

      <!-- Child Components (conditionally rendered based on state) -->
      <div v-else>
        <!-- Contact Actions Component -->
        <ContactActions 
          v-if="!showDeleteMessagesConfirmation"
          :is-blocked="props.isBlocked"
          :show-remove-confirmation="showRemoveConfirmation"
          :show-block-confirmation="showBlockConfirmation"
          :show-unblock-confirmation="showUnblockConfirmation"
          @remove="handleRemove"
          @cancel-remove="handleCancelRemove"
          @block="handleBlock"
          @unblock="handleUnblock"
          @show-remove-confirmation="showRemoveDialog"
          @show-block-confirmation="showBlockDialog"
          @show-unblock-confirmation="showUnblockDialog"
          @hide-confirmations="hideAllDialogs"
        />

        <!-- Message Management Component -->
        <MessageManagement 
          v-if="!showRemoveConfirmation && !showBlockConfirmation && !showUnblockConfirmation"
          :contact="props.contact"
          :display-name="user?.display_name || props.contact.display_name || props.contact.username"
          :show-delete-messages-confirmation="showDeleteMessagesConfirmation"
          @show-delete-confirmation="showDeleteMessagesDialog"
          @hide-confirmations="hideAllDialogs"
          @action-start="handleActionStart"
          @action-complete="handleActionComplete"
          @action-error="handleActionError"
        />
      </div>
    </div>
  </div>
</template>
