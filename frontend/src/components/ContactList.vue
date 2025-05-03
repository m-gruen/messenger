<template>
  <div class="contact-list-container">
    <h2 class="text-xl font-bold mb-3">Contacts</h2>

    <!-- Filter Options - Now outside of conditionals so always visible -->
    <div class="flex border-b mb-4">
      <button 
        @click="activeFilter = 'all'" 
        class="py-2 px-4 font-medium text-sm" 
        :class="activeFilter === 'all' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'"
      >
        All
      </button>
      <button 
        @click="activeFilter = 'accepted'" 
        class="py-2 px-4 font-medium text-sm" 
        :class="activeFilter === 'accepted' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'"
      >
        Contacts
      </button>
    </div>

    <div v-if="contactStore.loading" class="flex items-center justify-center p-4">
      <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
      <span class="ml-2">Loading contacts...</span>
    </div>

    <div v-else-if="contactStore.error" class="bg-destructive/10 text-destructive p-4 rounded-md">
      {{ contactStore.error }}
    </div>

    <div v-else-if="filteredContacts.length === 0" class="text-muted-foreground p-4">
      No contacts found.
    </div>

    <div v-else>
      <ul class="space-y-2">
        <li v-for="contact in filteredContacts" :key="contact.contactId"
          class="p-2 rounded-md hover:bg-accent flex items-center cursor-pointer"
          @click="selectContact(contact)"
        >
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            {{ (contact.display_name || contact.username).charAt(0).toUpperCase() }}
          </div>
          <div class="ml-3 flex-1 min-w-0">
            <div class="font-medium truncate">{{ contact.display_name || contact.username }}</div>
            <div class="text-xs text-muted-foreground flex items-center">
              <span class="inline-flex h-2 w-2 rounded-full mr-1" :class="getStatusColorClass(contact.status)"></span>
              <span class="truncate">{{ formatStatusText(contact.status) }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Contact } from '@/models/contact-model';
import { ContactStatus } from '@/models/contact-model';
import { useContactStore } from '@/stores/ContactStore';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', contact: Contact): void;
}>();

const contactStore = useContactStore();
const activeFilter = ref('all');

// Filtered contacts based on the selected filter
const filteredContacts = computed(() => {
  switch (activeFilter.value) {
    case 'accepted':
      return contactStore.acceptedContacts;
    default:
      return contactStore.contacts;
  }
});

onMounted(async () => {
  if (props.visible) {
    await contactStore.fetchAllContacts();
  }
});

// Re-fetch contacts when the component becomes visible
watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    await contactStore.fetchAllContacts();
  }
});

function selectContact(contact: Contact) {
  emit('select', contact);
}

function getStatusColorClass(status: ContactStatus): string {
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

function formatStatusText(status: ContactStatus): string {
  const statusString = status.toString();
  
  return statusString
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
</script>

<style scoped>
.contact-list-container {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
