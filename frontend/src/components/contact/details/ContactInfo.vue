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

    <!-- Added Date -->
    <p class="text-muted-foreground text-sm mt-4">
      Added: {{ DateFormatService.formatCreationDate(contact.createdAt) }}
    </p>
  </div>
</template>
