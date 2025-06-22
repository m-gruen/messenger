<template>
  <div class="p-4">
    <!-- Search Input Section -->
    <div class="mb-6">
      <div class="relative group">
        <div class="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-200"></div>
        <div class="relative flex gap-2 bg-card rounded-lg p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <Input 
            v-model="searchQuery" 
            placeholder="Search by username..." 
            class="border-0 shadow-none bg-transparent focus-visible:ring-0 flex-grow" 
            @keyup.enter="handleSearch" 
          />
          <Button 
            @click="handleSearch" 
            size="sm"
            class="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-sm"
          >
            <Search class="h-4 w-4 mr-1" />
            Search
          </Button>
        </div>
      </div>
      
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 ml-1">
        Find users by their username to add as contacts
      </p>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center p-8">
      <div class="animate-spin h-10 w-10 rounded-full border-b-2 border-indigo-600 mb-4"></div>
      <p class="text-slate-600 dark:text-slate-300">Searching for users...</p>
    </div>
    
    <!-- Search Results Section -->
    <div v-else-if="searchResults.length > 0" class="space-y-3">
      <div 
        v-for="user in searchResults" 
        :key="user.uid" 
        class="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/70 dark:to-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- User Avatar -->
            <div class="relative">
              <div class="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-inner">
                <template v-if="user.profile_picture">
                  <img 
                    :src="'data:image/jpeg;base64,' + user.profile_picture" 
                    class="w-12 h-12 object-cover" 
                    alt="Profile Picture" 
                  />
                </template>
                <template v-else>
                  <span class="text-lg font-semibold">{{ (user.display_name || user.username).charAt(0).toUpperCase() }}</span>
                </template>
              </div>
            </div>
            
            <!-- User Info -->
            <div class="flex flex-col">
              <h3 class="font-semibold text-slate-900 dark:text-slate-100">{{ user.display_name || user.username }}</h3>
              <p class="text-sm text-indigo-600 dark:text-indigo-400">@{{ user.username }}</p>
            </div>
          </div>
          
          <!-- Action Button -->
          <Button 
            @click="handleUserAction(user.uid)" 
            :variant="getButtonVariant(user.uid)"
            size="sm"
            :disabled="contactStore.getContactStatus(user.uid) === ContactStatus.ACCEPTED || 
                      contactStore.getContactStatus(user.uid) === ContactStatus.REJECTED ||
                      contactStore.getContactStatus(user.uid) === ContactStatus.BLOCKED"
            :class="[
              isPending(user.uid) ? 'opacity-70' : '',
              getButtonVariant(user.uid) === 'default' ? 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white' : '',
              getButtonVariant(user.uid) === 'destructive' ? 'bg-gradient-to-r from-red-500 to-rose-600' : ''
            ]"
          >
            <Loader2 v-if="isPending(user.uid)" class="h-3.5 w-3.5 mr-1.5 animate-spin" />
            <UserPlus v-else-if="getButtonVariant(user.uid) === 'outline'" class="h-3.5 w-3.5 mr-1.5" />
            <UserX v-else-if="getButtonVariant(user.uid) === 'destructive'" class="h-3.5 w-3.5 mr-1.5" />
            <CheckCircle v-else-if="getButtonVariant(user.uid) === 'secondary'" class="h-3.5 w-3.5 mr-1.5" />
            <Clock v-else-if="getButtonVariant(user.uid) === 'ghost'" class="h-3.5 w-3.5 mr-1.5" />
            <Check v-else class="h-3.5 w-3.5 mr-1.5" />
            {{ getButtonText(user.uid) }}
          </Button>
        </div>
      </div>
    </div>
    
    <!-- No Results State -->
    <div v-else-if="hasSearched" class="flex flex-col items-center justify-center p-10">
      <div class="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-full mb-4">
        <SearchX class="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      <p class="text-slate-600 dark:text-slate-300 text-center">No users found matching "{{ searchQuery }}"</p>
      <p class="text-slate-500 dark:text-slate-400 text-sm text-center mt-2">Try a different search term</p>
    </div>
    
    <!-- Initial State -->
    <div v-else class="flex flex-col items-center justify-center p-10">
      <div class="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-full mb-4">
        <UsersRound class="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      <p class="text-slate-600 dark:text-slate-300 text-center">Enter a username to search for users</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api.service';
import { useAuthStore } from '@/stores/AuthStore';
import { useContactStore } from '@/stores/ContactStore';
import { ContactStatus } from '@/models/contact-model';
import type { User } from '@/models/user-model';
import { useToast } from '@/composables/useToast';
import { Search, Loader2, UserPlus, UserX, CheckCircle, Clock, Check, SearchX, UsersRound } from 'lucide-vue-next';

const authStore = useAuthStore();
const contactStore = useContactStore();
const currentUserId = computed(() => authStore.user?.uid || 0);
const token = computed(() => authStore.user?.token || '');
const { showError, showSuccess, showInfo } = useToast();

const searchQuery = ref('');
const searchResults = ref<User[]>([]);
const loading = ref(false);
const error = ref('');
const hasSearched = ref(false);
const pendingRequests = ref<number[]>([]);

onMounted(async () => {
  if (currentUserId.value) {
    await contactStore.fetchAllContacts();
  }
});

async function handleSearch() {
  if (!searchQuery.value.trim()) {
    showError("Please enter a search term");
    return;
  }
  
  error.value = '';
  loading.value = true;
  hasSearched.value = true;
  
  try {
    searchResults.value = await apiService.searchUsers(searchQuery.value, token.value);
    // Filter out the current user from results
    searchResults.value = searchResults.value.filter(user => user.uid !== currentUserId.value);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to search users';
    error.value = errorMessage; // Keep for display in template
    showError(errorMessage);
    console.error('Error searching users:', err);
  } finally {
    loading.value = false;
  }
}

async function handleUserAction(userId: number) {
  if (isPending(userId)) {
    return; // Don't do anything if a request is already pending
  }
  
  const status = contactStore.getContactStatus(userId);
  
  switch (status) {
    case ContactStatus.INCOMING_REQUEST:
      await acceptIncomingRequest(userId);
      break;
    case ContactStatus.OUTGOING_REQUEST:
      await cancelOutgoingRequest(userId);
      break;
    case ContactStatus.DELETED:
    case null:
      await addNewContact(userId);
      break;
    // For other statuses, we won't do anything as the button will be disabled
    default:
      break;
  }
}

async function addNewContact(userId: number) {
  if (!currentUserId.value) {
    showError('You must be logged in to add contacts');
    return;
  }
  
  try {
    setPendingOperation(userId, true);
    const user = searchResults.value.find(u => u.uid === userId);
    if (!user) {
      throw new Error('User not found in search results');
    }
    
    await contactStore.addContact(userId, user.username);
    showSuccess(`Contact request sent to ${user.username}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to add contact';
    showError(errorMessage);
    console.error('Error adding contact:', err);
  } finally {
    setPendingOperation(userId, false);
  }
}

async function acceptIncomingRequest(userId: number) {
  try {
    setPendingOperation(userId, true);
    await contactStore.acceptContactRequest(userId);
    showSuccess('Contact request accepted');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to accept request';
    showError(errorMessage);
    console.error('Error accepting request:', err);
  } finally {
    setPendingOperation(userId, false);
  }
}

async function cancelOutgoingRequest(userId: number) {
  try {
    setPendingOperation(userId, true);
    await contactStore.cancelOutgoingRequest(userId);
    showInfo('Contact request cancelled');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to cancel request';
    showError(errorMessage);
    console.error('Error canceling request:', err);
  } finally {
    setPendingOperation(userId, false);
  }
}

function setPendingOperation(userId: number, value: boolean) {
  if (value) {
    pendingRequests.value.push(userId);
  } else {
    pendingRequests.value = pendingRequests.value.filter(id => id !== userId);
  }
}

function isPending(userId: number): boolean {
  return pendingRequests.value.includes(userId) || contactStore.isPending(userId);
}

function getButtonText(userId: number): string {
  if (isPending(userId) && !pendingRequests.value.includes(userId)) {
    return 'Processing...';
  }
  
  if (pendingRequests.value.includes(userId)) {
    return 'Sending...';
  }
  
  const status = contactStore.getContactStatus(userId);
  
  switch (status) {
    case ContactStatus.ACCEPTED:
      return 'Contact';
    case ContactStatus.INCOMING_REQUEST:
      return 'Accept';
    case ContactStatus.OUTGOING_REQUEST:
      return 'Pending';
    case ContactStatus.REJECTED:
      return 'Rejected';
    case ContactStatus.BLOCKED:
      return 'Blocked';
    case ContactStatus.DELETED:
      return 'Add Again';
    default:
      return 'Add Contact';
  }
}

function getButtonVariant(userId: number): 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' {
  const status = contactStore.getContactStatus(userId);
  
  switch (status) {
    case ContactStatus.ACCEPTED:
      return 'secondary';
    case ContactStatus.INCOMING_REQUEST:
      return 'default';
    case ContactStatus.OUTGOING_REQUEST:
      return 'ghost';
    case ContactStatus.REJECTED:
    case ContactStatus.BLOCKED:
      return 'destructive';
    case ContactStatus.DELETED:
      return 'outline';
    default:
      return 'outline';
  }
}
</script>

<style scoped>
/* Animations */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* Hover Effects */
.hover\:shadow-md:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Custom Button Styles */
:deep(.bg-gradient-to-r) {
  background-size: 200% auto;
  transition: background-position 0.3s ease;
}

:deep(.bg-gradient-to-r:hover) {
  background-position: right center;
}

/* Style for the glass effect on the search input */
.border {
  transition: border-color 0.2s ease;
}

.border:focus-within {
  border-color: rgba(99, 102, 241, 0.5);
}
</style>
