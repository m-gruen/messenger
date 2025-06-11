<template>
  <div class="user-search">
    <div class="search-container">
      <Input 
        v-model="searchQuery" 
        placeholder="Search users..." 
        class="search-input" 
        @keyup.enter="handleSearch" 
      />
      <Button @click="handleSearch" class="search-button" variant="outline" size="sm">
        Search
      </Button>
    </div>
    
    <div v-if="loading" class="search-loading">
      <p>Searching...</p>
    </div>
    
    <div v-else-if="error" class="search-error">
      <p>{{ error }}</p>
    </div>
    
    <div v-else-if="searchResults.length > 0" class="search-results">
      <div v-for="user in searchResults" :key="user.uid" class="search-result-item">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground overflow-hidden">
            <template v-if="user.profile_picture">
              <img :src="'data:image/jpeg;base64,' + user.profile_picture" class="w-10 h-10 object-cover rounded-full" alt="Profile Picture" />
            </template>
            <template v-else>
              {{ (user.display_name || user.username).charAt(0).toUpperCase() }}
            </template>
          </div>
          <div class="user-info">
            <h4>{{ user.display_name || user.username }}</h4>
            <p class="username">@{{ user.username }}</p>
          </div>
        </div>
        <Button 
          @click="handleUserAction(user.uid)" 
          :variant="getButtonVariant(user.uid)"
          size="sm"
          :disabled="contactStore.getContactStatus(user.uid) === ContactStatus.ACCEPTED || 
                    contactStore.getContactStatus(user.uid) === ContactStatus.REJECTED ||
                    contactStore.getContactStatus(user.uid) === ContactStatus.BLOCKED"
        >
          {{ getButtonText(user.uid) }}
        </Button>
      </div>
    </div>
    
    <div v-else-if="hasSearched" class="search-no-results">
      <p>No users found matching "{{ searchQuery }}"</p>
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

const authStore = useAuthStore();
const contactStore = useContactStore();
const currentUserId = computed(() => authStore.user?.uid || 0);
const token = computed(() => authStore.user?.token || '');

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
    error.value = "Please enter a search term";
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
    error.value = err instanceof Error ? err.message : 'Failed to search users';
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
    error.value = 'You must be logged in to add contacts';
    return;
  }
  
  try {
    setPendingOperation(userId, true);
    const user = searchResults.value.find(u => u.uid === userId);
    if (!user) {
      throw new Error('User not found in search results');
    }
    
    await contactStore.addContact(userId, user.username);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to add contact';
    console.error('Error adding contact:', err);
  } finally {
    setPendingOperation(userId, false);
  }
}

async function acceptIncomingRequest(userId: number) {
  try {
    setPendingOperation(userId, true);
    await contactStore.acceptContactRequest(userId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to accept request';
    console.error('Error accepting request:', err);
  } finally {
    setPendingOperation(userId, false);
  }
}

async function cancelOutgoingRequest(userId: number) {
  try {
    setPendingOperation(userId, true);
    await contactStore.cancelOutgoingRequest(userId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to cancel request';
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
.user-search {
  width: 100%;
  padding: 1rem;
}

.search-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-input {
  flex-grow: 1;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.search-result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background-color: rgba(0, 0, 0, 0.05);
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 0.8rem;
  opacity: 0.7;
  margin: 0;
}

.search-loading, .search-error, .search-no-results {
  text-align: center;
  padding: 1rem 0;
}

.search-error {
  color: #ef4444;
}
</style>
