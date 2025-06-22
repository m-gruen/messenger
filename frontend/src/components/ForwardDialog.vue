<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Send, X, Search, Users } from 'lucide-vue-next';
import { useContactStore } from '@/stores/ContactStore';
import { useMessageStore } from '@/stores/MessageStore';
import { useToast } from '@/composables/useToast';
import { apiService } from '@/services/api.service';
import { useAuthStore } from '@/stores/AuthStore';
import type { IMessage } from '@/models/message-model';
import type { Contact } from '@/models/contact-model';
import type { User } from '@/models/user-model';

interface Props {
  show: boolean;
  message: IMessage | null;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (e: 'forward', contactIds: number[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const contactStore = useContactStore();
const messageStore = useMessageStore();
const authStore = useAuthStore();
const { showInfo, showError } = useToast();

// User info cache for profile pictures and display names
const userInfoCache = ref<Map<number, User>>(new Map());
const loadingUserInfo = ref<Set<number>>(new Set());

// Create a function to get the display name for a contact
const getDisplayName = (contact: Contact) => {
  const userInfo = userInfoCache.value.get(contact.contactUserId);
  return userInfo?.display_name || contact.display_name || contact.username;
};

// Create a function to get initials for profile picture fallback
const getInitials = (contact: Contact) => {
  const name = getDisplayName(contact);
  return name.charAt(0).toUpperCase();
};

// Create a function to get profile picture
const getProfilePicture = (contact: Contact) => {
  const userInfo = userInfoCache.value.get(contact.contactUserId);
  return userInfo?.profile_picture;
};

// Function to load user info for a contact
const loadUserInfo = async (contactUserId: number) => {
  if (userInfoCache.value.has(contactUserId) || loadingUserInfo.value.has(contactUserId)) {
    return;
  }
  
  loadingUserInfo.value.add(contactUserId);
  
  try {
    const token = authStore.user?.token;
    if (token) {
      const userInfo = await apiService.getUserById(contactUserId, token);
      userInfoCache.value.set(contactUserId, userInfo);
    }
  } catch (error) {
    console.error('Failed to load user info:', error);
  } finally {
    loadingUserInfo.value.delete(contactUserId);
  }
};

const dialogRef = ref<HTMLDivElement | null>(null);
const searchInput = ref('');
const selectedContacts = ref<Set<number>>(new Set());
const isForwarding = ref(false);

// Computed properties
const filteredContacts = computed(() => {
  const searchTerm = searchInput.value.toLowerCase();
  return contactStore.acceptedContacts.filter(contact => {
    // Don't show the original sender in the list
    if (props.message && contact.contactUserId === props.message.sender_uid) {
      return false;
    }
    
    // Filter by display_name (if present) or username
    const displayName = contact.display_name?.toLowerCase() || '';
    const username = contact.username.toLowerCase();
    return displayName.includes(searchTerm) || username.includes(searchTerm);
  });
});

const canSend = computed(() => selectedContacts.value.size > 0);

// Methods
const handleClose = () => {
  emit('update:show', false);
  resetDialog();
};

const resetDialog = () => {
  searchInput.value = '';
  selectedContacts.value.clear();
  isForwarding.value = false;
};

const toggleContact = (contactUserId: number) => {
  if (selectedContacts.value.has(contactUserId)) {
    selectedContacts.value.delete(contactUserId);
  } else {
    selectedContacts.value.add(contactUserId);
  }
};

const handleForward = async () => {
  if (!canSend.value || !props.message) return;
  
  isForwarding.value = true;
  
  try {
    // Use the MessageStore's forwardMessage function which handles clearing replyTo
    await messageStore.forwardMessage(props.message, Array.from(selectedContacts.value));
    
    // Show success toast
    const contactCount = selectedContacts.value.size;
    showInfo(`Message sent to ${contactCount} contact${contactCount !== 1 ? 's' : ''}`);
    
    emit('forward', Array.from(selectedContacts.value));
    handleClose();
  } catch (error) {
    console.error('Failed to forward message:', error);
    
    // Show error toast
    showError('Failed to forward message. Please try again.');
  } finally {
    isForwarding.value = false;
  }
};

const handleClickOutside = (event: MouseEvent) => {
  if (dialogRef.value && !dialogRef.value.contains(event.target as Node)) {
    handleClose();
  }
};

const handleEscKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose();
  }
};

onMounted(async () => {
  document.addEventListener('mousedown', handleClickOutside);
  document.addEventListener('keydown', handleEscKey);
  
  // Load contacts if not already loaded
  if (contactStore.acceptedContacts.length === 0 && !contactStore.loading) {
    await contactStore.fetchAllContacts();
  }
  
  // Load user info for all contacts to get profile pictures
  for (const contact of contactStore.acceptedContacts) {
    loadUserInfo(contact.contactUserId);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  document.removeEventListener('keydown', handleEscKey);
});
</script>

<template>
  <teleport to="#portal-target">
    <div v-if="show" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
      <div 
        ref="dialogRef" 
        class="bg-gradient-to-b from-card to-card/90 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden border border-violet-300/20 dark:border-violet-800/30 shadow-2xl animate-scale-in relative flex flex-col"
      >
        <!-- Top accent bar -->
        <div class="h-1.5 w-full bg-gradient-to-r from-violet-500 to-purple-600"></div>
        
        <!-- Close button -->
        <button 
          @click="handleClose" 
          class="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors z-10" 
          aria-label="Close"
        >
          <X class="h-5 w-5" />
        </button>
        
        <!-- Header -->
        <div class="p-6 pb-3">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Users class="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 class="text-xl font-bold">Forward Message</h2>
          </div>
        </div>
        
        <!-- Search bar -->
        <div class="px-6 pb-4">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              v-model="searchInput"
              type="text"
              placeholder="Search contacts..."
              class="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <!-- Contact list -->
        <div class="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
          <div v-if="contactStore.loading" class="text-center py-8 text-slate-500">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto mb-3"></div>
            <p>Loading contacts...</p>
          </div>
          
          <div v-else-if="filteredContacts.length === 0" class="text-center py-8 text-slate-500">
            <Users class="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{{ searchInput ? 'No contacts found' : 'No contacts available' }}</p>
          </div>
          
          <div v-else class="space-y-2">
            <div
              v-for="contact in filteredContacts"
              :key="contact.contactUserId"
              @click="toggleContact(contact.contactUserId)"
              class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700/30 cursor-pointer transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/30"
              :class="{
                'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800/50': selectedContacts.has(contact.contactUserId)
              }"
            >
              <div class="flex-shrink-0">
                <!-- Profile picture or initials -->
                <div class="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  <template v-if="getProfilePicture(contact)">
                    <img 
                      :src="'data:image/jpeg;base64,' + getProfilePicture(contact)" 
                      class="w-8 h-8 object-cover" 
                      alt="Profile Picture" 
                    />
                  </template>
                  <template v-else>
                    <span class="text-sm font-semibold">{{ getInitials(contact) }}</span>
                  </template>
                </div>
              </div>
              
              <div class="flex-1 min-w-0">
                <!-- Display name (if available) or username -->
                <p class="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {{ getDisplayName(contact) }}
                </p>
                <!-- Show username as secondary text if display name is available -->
                <p v-if="contact.display_name" class="text-xs text-slate-500 dark:text-slate-400 truncate">
                  @{{ contact.username }}
                </p>
              </div>
              
              <div class="flex-shrink-0">
                <div 
                  class="w-5 h-5 rounded border-2 transition-all duration-200"
                  :class="{
                    'bg-violet-500 border-violet-500': selectedContacts.has(contact.contactUserId),
                    'border-slate-300 dark:border-slate-600': !selectedContacts.has(contact.contactUserId)
                  }"
                >
                  <svg 
                    v-if="selectedContacts.has(contact.contactUserId)"
                    class="w-3 h-3 text-white m-0.5" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Selected count -->
        <div v-if="selectedContacts.size > 0" class="px-6 py-2">
          <p class="text-sm text-slate-600 dark:text-slate-400">
            {{ selectedContacts.size }} contact{{ selectedContacts.size !== 1 ? 's' : '' }} selected
          </p>
        </div>
        
        <!-- Footer -->
        <div class="p-5 border-t border-slate-200 dark:border-slate-700/50 flex justify-end space-x-3 bg-slate-50/50 dark:bg-slate-800/30">
          <Button 
            variant="outline" 
            size="sm"
            class="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            @click="handleClose"
            :disabled="isForwarding"
          >
            <X class="h-4 w-4 mr-1.5" />
            Cancel
          </Button>
          <Button 
            variant="default"
            size="sm"
            class="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg hover:shadow-violet-500/20 transition-all duration-200"
            @click="handleForward"
            :disabled="!canSend || isForwarding"
          >
            <Send class="h-4 w-4 mr-1.5" />
            {{ isForwarding ? 'Sending...' : 'Send' }}
          </Button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
/* Animations */
.animate-fade-in {
  animation: fadeIn 0.3s ease forwards;
}

.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { 
    opacity: 0;
    transform: scale(0.95) translateY(10px); 
  }
  to { 
    opacity: 1;
    transform: scale(1) translateY(0); 
  }
}

/* Shadow enhancement */
.shadow-2xl {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 40px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

/* Add glow effects */
:deep([class*="from-violet-500"]) ~ .shadow-2xl {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 40px rgba(0, 0, 0, 0.15),
    0 0 20px rgba(139, 92, 246, 0.15);
}

/* Backdrop blur */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}
</style>
