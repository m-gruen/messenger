<template>
  <div class="contact-list-container">
    <!-- Header with Gradient -->
    <div class="p-6 border-b border-border/50 bg-gradient-to-b from-slate-50 to-card dark:from-slate-900/50 dark:to-card">
      <h2 class="text-xl font-bold mb-1 bg-gradient-to-r from-violet-700 to-indigo-600 dark:from-violet-500 dark:to-indigo-400 bg-clip-text text-transparent">Contacts</h2>
      <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Connect and chat with friends</p>
      
      <!-- Search Input -->
      <div class="relative mt-4 mb-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search contacts..."
          class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:focus:ring-indigo-400/50 transition-all"
        />
        <Search class="h-4 w-4 text-slate-400 absolute left-3 top-3" />
      </div>
      
      <!-- Modern filter tabs -->
      <div class="flex mt-2 bg-slate-100/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg p-1 shadow-inner">
        <button 
          @click="activeFilter = 'all'" 
          class="flex-1 py-2 px-4 font-medium text-sm rounded-md transition-all duration-200"
          :class="activeFilter === 'all' 
            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' 
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'"
        >
          All
        </button>
        <button 
          @click="activeFilter = 'accepted'" 
          class="flex-1 py-2 px-4 font-medium text-sm rounded-md transition-all duration-200"
          :class="activeFilter === 'accepted' 
            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' 
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'"
        >
          Contacts
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Loading State -->
      <div v-if="contactStore.loading" class="flex flex-col items-center justify-center h-40">
        <div class="relative w-12 h-12 mb-4">
          <div class="absolute inset-0 rounded-full border-2 border-violet-300/30"></div>
          <div class="absolute inset-0 rounded-full border-t-2 border-violet-600 animate-spin"></div>
        </div>
        <p class="text-slate-600 dark:text-slate-300">Loading contacts...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="localError" class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 my-2">
        <div class="flex items-center">
          <div class="flex-shrink-0 text-red-500">
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-600 dark:text-red-400">{{ localError }}</p>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredContacts.length === 0" class="flex flex-col items-center justify-center h-48 text-center p-4">
        <div class="rounded-full bg-slate-100 dark:bg-slate-800 p-3 mb-3">
          <Search v-if="searchQuery" class="h-6 w-6 text-slate-400" />
          <Users v-else class="h-6 w-6 text-slate-400" />
        </div>
        
        <template v-if="searchQuery">
          <p class="text-slate-700 dark:text-slate-300 font-medium">No matches found</p>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Try using different keywords or clearing your search
          </p>
        </template>
        <template v-else>
          <p class="text-slate-700 dark:text-slate-300 font-medium">No contacts found</p>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Try adding some new contacts to start chatting
          </p>
        </template>
      </div>

      <!-- Contact List -->
      <div v-else class="pt-2">
        <ul class="space-y-1.5">
          <li v-for="contact in filteredContacts" :key="contact.contactId"
            class="p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 group flex items-center cursor-pointer transition-all duration-200"
            @click="selectContact(contact)"
          >
            <!-- Avatar with gradient border on hover -->
            <div class="relative">
              <div class="absolute inset-0 rounded-full group-hover:bg-gradient-to-r group-hover:from-indigo-500 group-hover:to-violet-500 group-hover:animate-pulse-slow -m-0.5"></div>
              <div class="relative w-10 h-10 rounded-full bg-gradient-to-r from-indigo-200 to-violet-200 dark:from-indigo-700 dark:to-violet-700 flex items-center justify-center text-slate-700 dark:text-white overflow-hidden border-2 border-white dark:border-slate-800">
                <template v-if="contactStore.getUserInfo(contact.contactUserId)?.profile_picture">
                  <img :src="'data:image/jpeg;base64,' + contactStore.getUserInfo(contact.contactUserId)?.profile_picture" class="w-10 h-10 object-cover rounded-full" alt="Profile Picture" />
                </template>
                <template v-else>
                  {{ (contactStore.getUserInfo(contact.contactUserId)?.display_name || contact.display_name || contact.username).charAt(0).toUpperCase() }}
                </template>
              </div>
            </div>
            
            <!-- Contact Info -->
            <div class="ml-3 flex-1 min-w-0">
              <div class="font-medium truncate text-slate-800 dark:text-slate-200">
                {{ contactStore.getUserInfo(contact.contactUserId)?.display_name || contact.display_name || contact.username }}
              </div>
              <div class="flex items-center text-xs text-slate-500 dark:text-slate-400">
                <span 
                  class="inline-flex h-2 w-2 rounded-full mr-1.5 ring-1 ring-white dark:ring-slate-800" 
                  :class="getStatusColorClass(contact.status)"
                ></span>
                <span class="truncate">{{ formatStatusText(contact.status) }}</span>
              </div>
            </div>
            
            <!-- Hover indicator -->
            <div class="opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight class="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Contact } from '@/models/contact-model';
import { ContactStatus } from '@/models/contact-model';
import { useContactStore } from '@/stores/ContactStore';
import { Search, Users, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', contact: Contact): void;
}>();

const contactStore = useContactStore();
const activeFilter = ref('all');
const localError = ref<string | null>(null);
const searchQuery = ref('');

// Filtered contacts based on the selected filter and search query
const filteredContacts = computed(() => {
  let contacts;
  
  // First filter by tab selection
  switch (activeFilter.value) {
    case 'accepted':
      contacts = contactStore.acceptedContacts;
      break;
    default:
      contacts = contactStore.contacts;
      break;
  }
  
  // Then filter by search query if present
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    return contacts.filter(contact => {
      const displayName = contactStore.getUserInfo(contact.contactUserId)?.display_name || 
                          contact.display_name || 
                          contact.username || '';
      return displayName.toLowerCase().includes(query);
    });
  }
  
  return contacts;
});

onMounted(async () => {
  if (props.visible) {
    await fetchContacts();
  }
});

// Re-fetch contacts when the component becomes visible
watch(() => props.visible, async (isVisible) => {
  if (isVisible) {
    await fetchContacts();
  }
});

// Local function to fetch contacts and handle errors locally
async function fetchContacts() {
  localError.value = null;
  try {
    await contactStore.fetchAllContacts();
  } catch (err) {
    localError.value = err instanceof Error ? err.message : 'Failed to load contacts';
    console.error('Error fetching contacts in ContactList:', err);
  }
}

function selectContact(contact: Contact) {
  emit('select', contact);
}

function getStatusColorClass(status: ContactStatus): string {
  switch(status) {
    case ContactStatus.ACCEPTED:
      return 'bg-emerald-500 dark:bg-emerald-400';
    case ContactStatus.INCOMING_REQUEST:
    case ContactStatus.OUTGOING_REQUEST:
      return 'bg-amber-500 dark:bg-amber-400';
    case ContactStatus.REJECTED:
    case ContactStatus.BLOCKED:
      return 'bg-rose-500 dark:bg-rose-400';
    case ContactStatus.DELETED:
      return 'bg-slate-500 dark:bg-slate-400';
    default:
      return 'bg-indigo-500 dark:bg-indigo-400';
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
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Pulse animation for avatar borders */
@keyframes pulse-slow {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.animate-pulse-slow {
  animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Hover transition for list items */
.contact-list-item {
  transition: all 0.2s ease-in-out;
}

.contact-list-item:hover {
  transform: translateY(-1px);
}
</style>
