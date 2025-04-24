<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { ChevronLeft, MoreHorizontal } from 'lucide-vue-next'
import type { Contact } from '@/models/contact-model'
import { ContactStatus } from '@/models/contact-model'

defineProps({
  contact: {
    type: Object as () => Contact,
    required: true
  }
})

const emit = defineEmits(['back', 'details'])

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
  <div class="flex items-center p-4 border-b bg-card">
    <button @click="emit('back')" class="mr-2 rounded-full p-1.5 hover:bg-accent">
      <ChevronLeft class="h-5 w-5" />
    </button>

    <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
      {{ contact.username.charAt(0).toUpperCase() }}
    </div>

    <div class="ml-3">
      <div class="font-medium">{{ contact.username }}</div>
      <div class="text-xs text-muted-foreground">
        <span class="inline-flex h-2 w-2 rounded-full mr-1" :class="getStatusColorClass(contact.status)"></span>
        {{ formatStatusText(contact.status) }}
      </div>
    </div>

    <button @click="emit('details')" class="ml-auto rounded-full p-1.5 hover:bg-accent">
      <MoreHorizontal class="h-5 w-5" />
    </button>
  </div>
</template>