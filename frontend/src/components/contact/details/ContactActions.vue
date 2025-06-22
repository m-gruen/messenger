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
  <div v-if="props.showBlockConfirmation" class="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
    <p class="text-white text-center mb-2">Are you sure you want to block this contact?</p>
    <p class="text-indigo-200/70 text-sm text-center mb-4">Blocked contacts cannot message you, and you cannot
      message them.</p>
    <div class="flex justify-center gap-4">
      <button 
        @click="confirmBlock" 
        :disabled="isBlocking" 
        class="bg-gradient-to-r from-amber-700 to-orange-800 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white py-2 px-6 rounded-md shadow-sm transition-all duration-200"
      >
        <span v-if="isBlocking">Blocking...</span>
        <span v-else>Confirm</span>
      </button>
      <button 
        @click="hideConfirmations" 
        :disabled="isBlocking"
        class="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 py-2 px-6 rounded-md shadow-sm transition-all"
      >
        Cancel
      </button>
    </div>
  </div>

  <div v-else-if="props.showUnblockConfirmation" class="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
    <p class="text-white text-center mb-2">Are you sure you want to unblock this contact?</p>
    <p class="text-indigo-200/70 text-sm text-center mb-4">You will be able to exchange messages again.</p>
    <div class="flex justify-center gap-4">
      <button 
        @click="confirmUnblock" 
        :disabled="isUnblocking" 
        class="bg-gradient-to-r from-emerald-700 to-green-800 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 text-white py-2 px-6 rounded-md shadow-sm transition-all duration-200"
      >
        <span v-if="isUnblocking">Unblocking...</span>
        <span v-else>Confirm</span>
      </button>
      <button 
        @click="hideConfirmations" 
        :disabled="isUnblocking"
        class="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 py-2 px-6 rounded-md shadow-sm transition-all"
      >
        Cancel
      </button>
    </div>
  </div>

  <!-- Remove Contact Confirmation -->
  <div v-else-if="props.showRemoveConfirmation" class="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
    <p class="text-white text-center mb-2">Are you sure you want to remove this contact?</p>
    <div class="flex justify-center gap-4">
      <button 
        @click="confirmRemove" 
        :disabled="isRemoving" 
        class="bg-gradient-to-r from-rose-800 to-red-900 hover:from-rose-700 hover:to-red-800 disabled:opacity-50 text-white py-2 px-6 rounded-md shadow-sm transition-all duration-200"
      >
        <span v-if="isRemoving">Removing...</span>
        <span v-else>Confirm</span>
      </button>
      <button 
        @click="cancelRemove" 
        :disabled="isRemoving" 
        class="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 py-2 px-6 rounded-md shadow-sm transition-all"
      >
        Cancel
      </button>
    </div>
  </div>

  <!-- Action Buttons -->
  <div v-else class="flex flex-col gap-3">
    <div class="pt-3 pb-2">
      <h4 class="text-indigo-100 text-sm font-medium">Contact Management</h4>
    </div>
    <!-- Block/Unblock Button -->
    <div class="relative group" v-if="!isBlocked">
      <div class="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-700/20 rounded-md blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
      <button 
        @click="showBlockConfirmation" 
        :disabled="isBlocking || isUnblocking || isRemoving"
        class="relative w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border border-amber-700/50 disabled:opacity-50 text-amber-100 py-3 rounded-md flex justify-center items-center gap-2 transition-all shadow-sm"
      >
        <Shield class="h-5 w-5" />
        Block Contact
      </button>
    </div>

    <div class="relative group" v-else>
      <div class="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-green-700/20 rounded-md blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
      <button 
        @click="showUnblockConfirmation" 
        :disabled="isBlocking || isUnblocking || isRemoving"
        class="relative w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border border-emerald-700/50 disabled:opacity-50 text-emerald-100 py-3 rounded-md flex justify-center items-center gap-2 transition-all shadow-sm"
      >
        <Shield class="h-5 w-5" />
        Unblock Contact
      </button>
    </div>

    <!-- Remove Button -->
    <div class="relative group mt-1">
      <div class="absolute inset-0 bg-gradient-to-r from-rose-700/20 to-red-800/20 rounded-md blur opacity-70 group-hover:opacity-100 transition duration-200"></div>
      <button 
        @click="showRemoveConfirmation" 
        :disabled="isBlocking || isUnblocking || isRemoving"
        class="relative w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-750 hover:to-slate-850 border border-rose-800/50 disabled:opacity-50 text-rose-100 py-3 rounded-md flex justify-center items-center gap-2 transition-all shadow-sm"
      >
        Remove Contact
      </button>
    </div>
  </div>
</template>
