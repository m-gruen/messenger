<script setup lang="ts">
import { Shield } from "lucide-vue-next";

const props = defineProps({
  isBlocked: {
    type: Boolean,
    default: false
  },
  showRemoveConfirmation: {
    type: Boolean,
    default: false
  },
  showBlockConfirmation: {
    type: Boolean,
    default: false
  },
  showUnblockConfirmation: {
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
  }
});

const emit = defineEmits([
  'remove', 
  'cancel-remove', 
  'block', 
  'unblock',
  'show-remove-confirmation',
  'show-block-confirmation',
  'show-unblock-confirmation',
  'hide-confirmations'
]);

function confirmRemove() {
  emit('remove');
}

function cancelRemove() {
  emit('cancel-remove');
}

function confirmBlock() {
  emit('block');
}

function confirmUnblock() {
  emit('unblock');
}

function hideConfirmations() {
  emit('hide-confirmations');
}

function showRemoveConfirmation() {
  emit('show-remove-confirmation');
}

function showBlockConfirmation() {
  emit('show-block-confirmation');
}

function showUnblockConfirmation() {
  emit('show-unblock-confirmation');
}
</script>

<template>
  <!-- Block/Unblock Confirmation -->
  <div v-if="props.showBlockConfirmation" class="mb-4">
    <p class="text-white text-center mb-2">Are you sure you want to block this contact?</p>
    <p class="text-muted-foreground text-sm text-center mb-4">Blocked contacts cannot message you, and you cannot
      message them.</p>
    <div class="flex justify-center gap-4">
      <button @click="confirmBlock" :disabled="isBlocking" class="bg-orange-800 hover:bg-orange-700 disabled:opacity-50 text-white py-2 px-4 rounded-md">
        <span v-if="isBlocking">Blocking...</span>
        <span v-else>Confirm</span>
      </button>
      <button @click="hideConfirmations" :disabled="isBlocking"
        class="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded-md">
        Cancel
      </button>
    </div>
  </div>

  <div v-else-if="props.showUnblockConfirmation" class="mb-4">
    <p class="text-white text-center mb-2">Are you sure you want to unblock this contact?</p>
    <p class="text-muted-foreground text-sm text-center mb-4">You will be able to exchange messages again.</p>
    <div class="flex justify-center gap-4">
      <button @click="confirmUnblock" :disabled="isUnblocking" class="bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white py-2 px-4 rounded-md">
        <span v-if="isUnblocking">Unblocking...</span>
        <span v-else>Confirm</span>
      </button>
      <button @click="hideConfirmations" :disabled="isUnblocking"
        class="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded-md">
        Cancel
      </button>
    </div>
  </div>

  <!-- Remove Contact Confirmation -->
  <div v-else-if="props.showRemoveConfirmation" class="mb-4">
    <p class="text-white text-center mb-2">Are you sure you want to remove this contact?</p>
    <div class="flex justify-center gap-4">
      <button @click="confirmRemove" :disabled="isRemoving" class="bg-red-900 hover:bg-red-800 disabled:opacity-50 text-white py-2 px-4 rounded-md">
        <span v-if="isRemoving">Removing...</span>
        <span v-else>Confirm</span>
      </button>
      <button @click="cancelRemove" :disabled="isRemoving" class="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded-md">
        Cancel
      </button>
    </div>
  </div>

  <!-- Action Buttons -->
  <div v-else class="flex flex-col gap-3">
    <div class="pt-3 pb-1">
      <h4 class="text-white text-sm font-semibold">Contact Management</h4>
    </div>
    <!-- Block/Unblock Button -->
    <button v-if="!isBlocked" @click="showBlockConfirmation" :disabled="isBlocking || isUnblocking || isRemoving"
      class="w-full bg-orange-800 hover:bg-orange-700 disabled:opacity-50 text-white py-3 rounded-md flex justify-center items-center gap-2">
      <Shield class="h-5 w-5" />
      Block Contact
    </button>

    <button v-else @click="showUnblockConfirmation" :disabled="isBlocking || isUnblocking || isRemoving"
      class="w-full bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-md flex justify-center items-center gap-2">
      <Shield class="h-5 w-5" />
      Unblock Contact
    </button>

    <!-- Remove Button -->
    <button @click="showRemoveConfirmation" :disabled="isBlocking || isUnblocking || isRemoving"
      class="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 text-white py-3 rounded-md flex justify-center items-center">
      Remove Contact
    </button>
  </div>
</template>
