<script setup lang="ts">
import { ref, computed, onMounted, watch, defineProps, defineEmits } from 'vue';
import { X, Shield } from "lucide-vue-next";
import type { Contact } from '@/models/contact-model';
import { ContactStatus } from '@/models/contact-model';
import { DateFormatService } from '@/services/date-format.service';
import { useAuthStore } from '@/stores/AuthStore';
import { apiService } from '@/services/api.service';
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
const user = ref<User | null>(null);

// Reintroduced refs for confirmation dialogs
const showRemoveConfirmation = ref(false);
const showBlockConfirmation = ref(false);
const showUnblockConfirmation = ref(false);

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

      <div v-if="blockSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact blocked successfully!
      </div>

      <div v-if="unblockSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact unblocked successfully!
      </div>

      <div v-if="removalSuccess" class="bg-success/10 text-green-500 p-4 rounded-md mb-4">
        Contact removed successfully!
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

      <!-- Loading Indicators -->
      <div v-else-if="isRemoving || isBlocking || isUnblocking" class="flex justify-center items-center mb-4">
        <div class="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full"></div>
        <span class="ml-2 text-white">
          {{ isRemoving ? 'Removing contact...' : isBlocking ? 'Blocking contact...' : 'Unblocking contact...' }}
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

        <!-- Remove Button -->
        <button @click="removeContact"
          class="w-full bg-red-900 hover:bg-red-800 text-white py-3 rounded-md flex justify-center items-center">
          Remove Contact
        </button>
      </div>
    </div>
  </div>
</template>
