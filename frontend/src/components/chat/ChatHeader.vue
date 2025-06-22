<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { ChevronLeft, MoreHorizontal } from 'lucide-vue-next'
import type { Contact } from '@/models/contact-model'
import { ContactStatus } from '@/models/contact-model'
import { useContactStore } from '@/stores/ContactStore';
import { computed } from 'vue';

const props = defineProps({
  contact: {
    type: Object as () => Contact,
    required: true
  }
})

const emit = defineEmits(['back', 'details'])

const contactStore = useContactStore();

const userInfo = computed(() => contactStore.getUserInfo(props.contact.contactUserId));

const displayName = computed(() => userInfo.value?.display_name || props.contact.display_name || props.contact.username);
const profilePicture = computed(() => userInfo.value?.profile_picture || null);

function getStatusColorClass(status: ContactStatus | string): string {
  switch(status) {
    case ContactStatus.ACCEPTED:
      return 'bg-emerald-500';
    case ContactStatus.INCOMING_REQUEST:
    case ContactStatus.OUTGOING_REQUEST:
      return 'bg-amber-400';
    case ContactStatus.REJECTED:
    case ContactStatus.BLOCKED:
      return 'bg-rose-500';
    case ContactStatus.DELETED:
      return 'bg-slate-500';
    default:
      return 'bg-indigo-500';
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
  <div class="flex items-center p-4 border-b border-indigo-900/30 bg-gradient-to-r from-slate-900 to-slate-800">
    <button @click="emit('back')" class="mr-2 rounded-full p-1.5 hover:bg-slate-700/50 transition-colors">
      <ChevronLeft class="h-5 w-5 text-indigo-100" />
    </button>

    <button @click="emit('details')" class="flex items-center">
      <div class="relative">
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full blur opacity-40"></div>
        <div class="relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-950 to-slate-800 flex items-center justify-center text-indigo-100 border border-indigo-500/30 overflow-hidden">
          <template v-if="profilePicture">
            <img :src="'data:image/jpeg;base64,' + profilePicture" class="w-10 h-10 object-cover" alt="Profile Picture" />
          </template>
          <template v-else>
            {{ displayName.charAt(0).toUpperCase() }}
          </template>
        </div>
      </div>
  
      <div class="ml-3">
        <div class="font-medium text-white">{{ displayName }}</div>
        <div class="text-xs text-indigo-300/80 flex items-center">
          <span class="inline-flex h-2 w-2 rounded-full mr-1 shadow-glow" :class="getStatusColorClass(props.contact.status)"></span>
          {{ formatStatusText(props.contact.status) }}
        </div>
      </div>
    </button>

    <button @click="emit('details')" class="ml-auto rounded-full p-1.5 hover:bg-slate-700/50 transition-colors">
      <MoreHorizontal class="h-5 w-5 text-indigo-100" />
    </button>
  </div>
</template>
