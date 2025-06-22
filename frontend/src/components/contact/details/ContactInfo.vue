<script setup lang="ts">
import { computed } from 'vue';
import type { Contact } from '@/models/contact-model';
import { ContactStatus } from '@/models/contact-model';
import { DateFormatService } from '@/services/date-format.service';
import type { User } from '@/models/user-model';

const props = defineProps({
  contact: {
    type: Object as () => Contact,
    required: true
  },
  user: {
    type: Object as () => User | null,
    default: null
  }
});

const displayName = computed(() => props.user?.display_name || props.contact.display_name || props.contact.username);
const profilePicture = computed(() => props.user?.profile_picture || null);

function getStatusColorClass(status: ContactStatus | string): string {
  switch (status) {
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
  <div class="flex flex-col items-center py-7 px-4">
    <!-- Avatar Circle with Gradient Border -->
    <div class="relative">
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full blur opacity-50"></div>
      <div class="relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-950 to-slate-800 flex items-center justify-center text-indigo-100 text-6xl font-medium overflow-hidden border-2 border-indigo-500/30">
        <template v-if="profilePicture">
          <img :src="'data:image/jpeg;base64,' + profilePicture" class="w-32 h-32 object-cover" alt="Profile Picture" />
        </template>
        <template v-else>
          {{ displayName.charAt(0).toUpperCase() }}
        </template>
      </div>
    </div>

    <!-- Username and Display Name -->
    <div class="mt-5 text-center">
      <h3 class="text-2xl font-medium text-white">{{ displayName }}</h3>
      <p class="text-sm text-indigo-300/80 mt-1" v-if="user?.username || contact.display_name">@{{ user?.username || contact.username }}</p>
    </div>

    <!-- Status with glowing indicator -->
    <div class="mt-3 flex items-center justify-center px-4 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
      <span class="inline-flex h-3 w-3 rounded-full mr-2 shadow-glow" :class="getStatusColorClass(contact.status)"></span>
      <span class="text-indigo-100">{{ formatStatusText(contact.status) }}</span>
    </div>

    <!-- Added Date -->
    <p class="text-indigo-300/50 text-sm mt-4">
      Added: {{ DateFormatService.formatCreationDate(contact.createdAt) }}
    </p>
  </div>
</template>
