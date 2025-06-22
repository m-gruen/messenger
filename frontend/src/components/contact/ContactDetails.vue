<script setup lang="ts">
import { ref, computed, onMounted, watch, defineProps, defineEmits } from 'vue';
import { X, Shield, Trash2, Download, Upload } from "lucide-vue-next";
import type { Contact } from '@/models/contact-model';
import { ContactStatus } from '@/models/contact-model';
import { DateFormatService } from '@/services/date-format.service';
import { useAuthStore } from '@/stores/AuthStore';
import { useMessageStore } from '@/stores/MessageStore';
import { apiService } from '@/services/api.service';
import { indexedDBService } from '@/services/indexeddb.service';
import type { User } from '@/models/user-model';

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

const authStore = useAuthStore();
const messageStore = useMessageStore();
const user = ref<User | null>(null);

// Reintroduced refs for confirmation dialogs
const showRemoveConfirmation = ref(false);
const showBlockConfirmation = ref(false);
const showUnblockConfirmation = ref(false);

// Added refs for message management confirmation dialogs
const showDeleteMessagesConfirmation = ref(false);
const isDeletingMessages = ref(false);
const isExportingMessages = ref(false);
const isImportingMessages = ref(false);
const messageActionSuccess = ref<string | null>(null);
const messageActionError = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Fetch the user info for the contact
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

const displayName = computed(() => user.value?.display_name || props.contact.display_name || props.contact.username);
const profilePicture = computed(() => user.value?.profile_picture || null);

function removeContact() {
  if (showRemoveConfirmation.value) {
    emit('remove')
    showRemoveConfirmation.value = false
  } else {
    showRemoveConfirmation.value = true
    showBlockConfirmation.value = false
    showUnblockConfirmation.value = false
    showDeleteMessagesConfirmation.value = false
  }
}

function cancelRemoveContact() {
  showRemoveConfirmation.value = false
  emit('cancel-remove')
}

function blockContact() {
  if (showBlockConfirmation.value) {
    emit('block')
    showBlockConfirmation.value = false
  } else {
    showBlockConfirmation.value = true
    showRemoveConfirmation.value = false
    showUnblockConfirmation.value = false
    showDeleteMessagesConfirmation.value = false
  }
}

function unblockContact() {
  if (showUnblockConfirmation.value) {
    emit('unblock')
    showUnblockConfirmation.value = false
  } else {
    showUnblockConfirmation.value = true
    showRemoveConfirmation.value = false
    showBlockConfirmation.value = false
    showDeleteMessagesConfirmation.value = false
  }
}

// New functions for message management
async function deleteContactMessages() {
  if (showDeleteMessagesConfirmation.value) {
    showDeleteMessagesConfirmation.value = false
    
    // Implementation for deleting messages
    isDeletingMessages.value = true
    messageActionError.value = null
    messageActionSuccess.value = null
    
    try {
      // Use the message store function to delete messages for this contact
      const success = await messageStore.deleteContactMessages(props.contact.contactUserId)
      
      if (success) {
        messageActionSuccess.value = "Messages deleted successfully"
      } else {
        messageActionError.value = "Failed to delete messages"
      }
    } catch (error: any) {
      messageActionError.value = error.message || "An error occurred while deleting messages"
      console.error("Error deleting contact messages:", error)
    } finally {
      isDeletingMessages.value = false
    }
  } else {
    showDeleteMessagesConfirmation.value = true
    showRemoveConfirmation.value = false
    showBlockConfirmation.value = false
    showUnblockConfirmation.value = false
  }
}

async function exportContactMessages() {
  isExportingMessages.value = true
  messageActionError.value = null
  messageActionSuccess.value = null
  
  try {
    if (!authStore.user?.uid) {
      throw new Error("User not authenticated")
    }
    
    // Create a specific key for this contact's messages
    const contactKey = `messages_${authStore.user.uid}_${props.contact.contactUserId}`
    
    // Get all data from IndexedDB
    const allData = await indexedDBService.exportAllMessages()
    
    // Extract only this contact's messages
    const contactData: Record<string, any> = {}
    if (allData[contactKey]) {
      contactData[contactKey] = allData[contactKey]
    }
    
    // Create the backup data structure
    const backup = {
      version: 2,
      userId: authStore.user.uid,
      contactId: props.contact.contactUserId,
      timestamp: new Date().toISOString(),
      data: contactData
    }
    
    // Create a downloadable file
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `messages_${displayName.value.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
    
    messageActionSuccess.value = "Messages exported successfully"
  } catch (error: any) {
    messageActionError.value = error.message || "Failed to export messages"
    console.error("Error exporting contact messages:", error)
  } finally {
    isExportingMessages.value = false
  }
}

function openFileDialog() {
  if (fileInputRef.value && !isImportingMessages.value) {
    fileInputRef.value.click()
  }
}

async function importContactMessages(event: Event) {
  const fileInput = event.target as HTMLInputElement
  if (!fileInput.files || fileInput.files.length === 0) {
    return
  }
  
  isImportingMessages.value = true
  messageActionError.value = null
  messageActionSuccess.value = null
  
  try {
    const file = fileInput.files[0]
    const text = await file.text()
    const backup = JSON.parse(text)
    
    // Validate backup format
    if (!backup.version || !backup.data) {
      throw new Error("Invalid backup file format")
    }
    
    // Import the messages
    const importedCount = await indexedDBService.importMessages(backup.data)
    
    // Clear the file input
    fileInput.value = ''
    
    // Refresh the messages display if this contact is currently active
    if (messageStore.activeContactId === props.contact.contactUserId) {
      await messageStore.fetchMessages(props.contact.contactUserId)
    }
    
    messageActionSuccess.value = `Successfully imported ${importedCount} conversation(s)`
  } catch (error: any) {
    messageActionError.value = error.message || "Failed to import messages"
    console.error("Error importing contact messages:", error)
  } finally {
    isImportingMessages.value = false
  }
}

function getStatusColorClass(status: ContactStatus | string): string {
  switch (status) {
    case ContactStatus.ACCEPTED:
      return 'bg-green-500';
    case ContactStatus.INCOMING_REQUEST:
    case ContactStatus.OUTGOING_REQUEST:
      return 'bg-yellow-500';
    case ContactStatus.REJECTED:
    case ContactStatus.BLOCKED:
      return 'bg-red-500';
    case ContactStatus.DELETED:
      return 'bg-gray-500';
    default:
      return 'bg-blue-500';
  }
}

function formatStatusText(status: ContactStatus | string): string {
  let statusString: string;

  if (status === ContactStatus.ACCEPTED) statusString = 'accepted';
  else if (status === ContactStatus.INCOMING_REQUEST) statusString = 'incoming_request';
  else if (status === ContactStatus.OUTGOING_REQUEST) statusString = 'outgoing_request';
  else if (status === ContactStatus.REJECTED) statusString = 'rejected';
  else if (status === ContactStatus.BLOCKED) statusString = 'blocked';
  else if (status === ContactStatus.DELETED) statusString = 'deleted';
  else statusString = status as string;

  return statusString
    .split('_')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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

    <!-- Contact Info -->
    <div class="flex flex-col items-center py-6 px-4">
      <!-- Avatar Circle -->
      <div
        class="w-32 h-32 rounded-full bg-white flex items-center justify-center text-black text-6xl font-medium mb-4 overflow-hidden">
        <template v-if="profilePicture">
          <img :src="'data:image/jpeg;base64,' + profilePicture" class="w-32 h-32 object-cover rounded-full" alt="Profile Picture" />
        </template>
        <template v-else>
          {{ displayName.charAt(0).toUpperCase() }}
        </template>
      </div>

      <!-- Username and Display Name -->
      <h3 class="text-2xl font-medium text-white mt-2">{{ displayName }}</h3>
      <p class="text-sm text-muted-foreground mt-1" v-if="user?.username || contact.display_name">@{{ user?.username || contact.username }}</p>

      <!-- Status -->
      <div class="mt-2 flex items-center">
        <span class="inline-flex h-3 w-3 rounded-full mr-2" :class="getStatusColorClass(contact.status)"></span>
        <span class="text-white">{{ formatStatusText(contact.status) }}</span>
      </div>

      <!-- Added Date - Using DateFormatService class directly -->
      <p class="text-muted-foreground text-sm mt-4">
        Added: {{ DateFormatService.formatCreationDate(contact.createdAt) }}
      </p>
    </div>

    <!-- Divider -->
    <div class="border-t border-border mx-4 my-2"></div>

    <!-- Actions Section -->
    <div class="px-4 py-6 space-y-4">
      <!-- Error/Success Messages -->
      <div v-if="actionError" class="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
        {{ actionError }}
      </div>

      <div v-if="messageActionError" class="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
        {{ messageActionError }}
      </div>

      <div v-if="blockSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact blocked successfully!
      </div>

      <div v-if="unblockSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact unblocked successfully!
      </div>

      <div v-if="removalSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact removed successfully!
      </div>
      
      <div v-if="messageActionSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        {{ messageActionSuccess }}
      </div>

      <!-- Block/Unblock Confirmation -->
      <div v-if="showBlockConfirmation" class="mb-4">
        <p class="text-white text-center mb-2">Are you sure you want to block this contact?</p>
        <p class="text-muted-foreground text-sm text-center mb-4">Blocked contacts cannot message you, and you cannot
          message them.</p>
        <div class="flex justify-center gap-4">
          <button @click="blockContact" class="bg-orange-800 hover:bg-orange-700 text-white py-2 px-4 rounded-md">
            Confirm
          </button>
          <button @click="showBlockConfirmation = false"
            class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md">
            Cancel
          </button>
        </div>
      </div>

      <div v-else-if="showUnblockConfirmation" class="mb-4">
        <p class="text-white text-center mb-2">Are you sure you want to unblock this contact?</p>
        <p class="text-muted-foreground text-sm text-center mb-4">You will be able to exchange messages again.</p>
        <div class="flex justify-center gap-4">
          <button @click="unblockContact" class="bg-green-800 hover:bg-green-700 text-white py-2 px-4 rounded-md">
            Confirm
          </button>
          <button @click="showUnblockConfirmation = false"
            class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md">
            Cancel
          </button>
        </div>
      </div>

      <!-- Remove Contact Confirmation -->
      <div v-else-if="showRemoveConfirmation" class="mb-4">
        <p class="text-white text-center mb-2">Are you sure you want to remove this contact?</p>
        <div class="flex justify-center gap-4">
          <button @click="removeContact" class="bg-red-900 hover:bg-red-800 text-white py-2 px-4 rounded-md">
            Confirm
          </button>
          <button @click="cancelRemoveContact" class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md">
            Cancel
          </button>
        </div>
      </div>
      
      <!-- Delete Messages Confirmation -->
      <div v-else-if="showDeleteMessagesConfirmation" class="mb-4">
        <p class="text-white text-center mb-2">Are you sure you want to delete all messages with this contact?</p>
        <p class="text-muted-foreground text-sm text-center mb-4">This will delete all message history with this contact from your device. This action cannot be undone.</p>
        <div class="flex justify-center gap-4">
          <button @click="deleteContactMessages" class="bg-red-900 hover:bg-red-800 text-white py-2 px-4 rounded-md">
            Confirm
          </button>
          <button @click="showDeleteMessagesConfirmation = false"
            class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md">
            Cancel
          </button>
        </div>
      </div>

      <!-- Loading Indicators -->
      <div v-else-if="isRemoving || isBlocking || isUnblocking || isDeletingMessages || isExportingMessages || isImportingMessages" class="flex justify-center items-center mb-4">
        <div class="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full"></div>
        <span class="ml-2 text-white">
          {{ isRemoving ? 'Removing contact...' : 
             isBlocking ? 'Blocking contact...' : 
             isUnblocking ? 'Unblocking contact...' :
             isDeletingMessages ? 'Deleting messages...' :
             isExportingMessages ? 'Exporting messages...' : 'Importing messages...' }}
        </span>
      </div>

      <!-- Action Buttons -->
      <div v-else class="flex flex-col gap-3">
        <!-- Block/Unblock Button -->
        <button v-if="!isBlocked" @click="blockContact"
          class="w-full bg-orange-800 hover:bg-orange-700 text-white py-3 rounded-md flex justify-center items-center gap-2">
          <Shield class="h-5 w-5" />
          Block Contact
        </button>

        <button v-else @click="unblockContact"
          class="w-full bg-green-800 hover:bg-green-700 text-white py-3 rounded-md flex justify-center items-center gap-2">
          <Shield class="h-5 w-5" />
          Unblock Contact
        </button>
        
        <!-- Message Management Section Header -->
        <div class="border-t border-border pt-3 pb-1">
          <h4 class="text-white text-sm font-semibold">Message Management</h4>
        </div>
        
        <!-- Delete Messages Button -->
        <button @click="deleteContactMessages" 
          class="w-full bg-red-700 hover:bg-red-600 text-white py-3 rounded-md flex justify-center items-center gap-2">
          <Trash2 class="h-5 w-5" />
          Delete All Messages
        </button>
        
        <!-- Export Messages Button -->
        <button @click="exportContactMessages"
          class="w-full bg-blue-700 hover:bg-blue-600 text-white py-3 rounded-md flex justify-center items-center gap-2">
          <Download class="h-5 w-5" />
          Export Messages
        </button>
        
        <!-- Import Messages Button -->
        <button @click="openFileDialog"
          class="w-full bg-green-700 hover:bg-green-600 text-white py-3 rounded-md flex justify-center items-center gap-2">
          <Upload class="h-5 w-5" />
          Import Messages
        </button>
        
        <!-- Hidden file input for importing messages -->
        <input 
          ref="fileInputRef" 
          type="file" 
          accept=".json" 
          class="hidden" 
          @change="importContactMessages"
        />
        
        <div class="border-t border-border pt-3 pb-1">
          <h4 class="text-white text-sm font-semibold">Contact Management</h4>
        </div>

        <!-- Remove Button -->
        <button @click="removeContact"
          class="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded-md flex justify-center items-center">
          Remove Contact
        </button>
      </div>
    </div>
  </div>
</template>
