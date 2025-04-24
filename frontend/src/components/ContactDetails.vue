<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'
import { X } from "lucide-vue-next"
import type { Contact } from '@/models/contact-model'
import { ContactStatus } from '@/models/contact-model'

defineProps({
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
  removalError: {
    type: String,
    default: undefined
  },
  removalSuccess: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'remove', 'cancel-remove'])

const showRemoveConfirmation = ref(false)

function removeContact() {
  if (showRemoveConfirmation.value) {
    emit('remove')
    showRemoveConfirmation.value = false
  } else {
    showRemoveConfirmation.value = true
  }
}

function cancelRemoveContact() {
  showRemoveConfirmation.value = false
  emit('cancel-remove')
}

function getStatusColorClass(status: ContactStatus | string): string {
  switch(status) {
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
    class="fixed top-0 right-0 bottom-0 z-30 w-80 bg-black overflow-y-auto transform transition-transform duration-300 ease-in-out shadow-xl">
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
      <div class="w-32 h-32 rounded-full bg-white flex items-center justify-center text-black text-6xl font-medium mb-4">
        {{ contact.username.charAt(0).toUpperCase() }}
      </div>
      
      <!-- Username -->
      <h3 class="text-2xl font-medium text-white mt-2">{{ contact.username }}</h3>
      
      <!-- Status -->
      <div class="mt-2 flex items-center">
        <span class="inline-flex h-3 w-3 rounded-full mr-2" :class="getStatusColorClass(contact.status)"></span>
        <span class="text-white">{{ formatStatusText(contact.status) }}</span>
      </div>
      
      <!-- Added Date -->
      <p class="text-muted-foreground text-sm mt-4">
        Added: {{ new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
      </p>
    </div>
    
    <!-- Divider -->
    <div class="border-t border-border mx-4 my-2"></div>
    
    <!-- Actions Section -->
    <div class="px-4 py-6">
      <div v-if="showRemoveConfirmation" class="mb-4">
        <p class="text-white text-center mb-2">Are you sure you want to remove this contact?</p>
        <div class="flex justify-center gap-4">
          <button @click="removeContact" 
            class="bg-red-900 hover:bg-red-800 text-white py-2 px-4 rounded-md">
            Confirm
          </button>
          <button @click="cancelRemoveContact" 
            class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md">
            Cancel
          </button>
        </div>
      </div>
      <div v-else-if="isRemoving" class="flex justify-center items-center mb-4">
        <div class="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full"></div>
        <span class="ml-2 text-white">Removing contact...</span>
      </div>
      <div v-else-if="removalError" class="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
        {{ removalError }}
      </div>
      <div v-else-if="removalSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact removed successfully!
      </div>
      <button v-if="!showRemoveConfirmation && !isRemoving && !removalSuccess" @click="removeContact" 
        class="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded-md flex justify-center items-center">
        Remove Contact
      </button>
    </div>
  </div>
</template>