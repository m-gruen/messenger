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
        <div class="user-info">
          <h4>{{ user.display_name || user.username }}</h4>
          <p class="username">@{{ user.username }}</p>
        </div>
        <Button 
          @click="handleUserAction(user.uid)" 
          :variant="getButtonVariant(user.uid)"
          size="sm"
          :disabled="isPending(user.uid) || isExistingContact(user.uid)"
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
import type { User } from '@/models/user-model';
import type { Contact } from '@/models/contact-model';
import { ContactStatus } from '@/models/contact-model';

const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.uid || 0);
const token = computed(() => authStore.user?.token || '');

const searchQuery = ref('');
const searchResults = ref<User[]>([]);
const loading = ref(false);
const error = ref('');
const hasSearched = ref(false);
const pendingRequests = ref<number[]>([]);
const userContacts = ref<Contact[]>([]);
const loadingContacts = ref(false);

onMounted(async () => {
  if (currentUserId.value) {
    await fetchContacts();
  }
});

async function fetchContacts() {
  if (!currentUserId.value) return;
  
  loadingContacts.value = true;
  try {
    userContacts.value = await apiService.getContacts(currentUserId.value, token.value);
  } catch (err) {
    console.error('Error fetching contacts:', err);
  } finally {
    loadingContacts.value = false;
  }
}

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
  
  const status = getContactStatus(userId);
  
  switch (status) {
    case ContactStatus.INCOMING_REQUEST:
      await acceptContactRequest(userId);
      break;
    case ContactStatus.OUTGOING_REQUEST:
      await cancelOutgoingRequest(userId);
      break;
    case ContactStatus.DELETED:
    case null:
      await addContact(userId);
      break;
    // For other statuses, we won't do anything as the button will be disabled
    default:
      break;
  }
}

async function acceptContactRequest(userId: number) {
  if (!currentUserId.value) {
    error.value = 'You must be logged in to accept requests';
    return;
  }
  
  try {
    pendingRequests.value.push(userId);
    await apiService.acceptContactRequest(currentUserId.value, userId, token.value);
    // Update the contact status in our local list
    const contactIndex = userContacts.value.findIndex(contact => contact.contactUserId === userId);
    if (contactIndex >= 0) {
      userContacts.value[contactIndex].status = ContactStatus.ACCEPTED;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to accept contact request';
    console.error('Error accepting contact request:', err);
  } finally {
    pendingRequests.value = pendingRequests.value.filter(id => id !== userId);
  }
}

async function cancelOutgoingRequest(userId: number) {
  if (!currentUserId.value) {
    error.value = 'You must be logged in to cancel requests';
    return;
  }
  
  try {
    pendingRequests.value.push(userId);
    await apiService.deleteContact(currentUserId.value, userId, token.value);
    // Remove the contact from our local list
    userContacts.value = userContacts.value.filter(contact => contact.contactUserId !== userId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to cancel request';
    console.error('Error canceling request:', err);
  } finally {
    pendingRequests.value = pendingRequests.value.filter(id => id !== userId);
  }
}

async function addContact(userId: number) {
  if (!currentUserId.value) {
    error.value = 'You must be logged in to add contacts';
    return;
  }
  
  try {
    pendingRequests.value.push(userId);
    await apiService.addContact(currentUserId.value, userId, token.value);
    
    // Add the new contact to userContacts array with OUTGOING_REQUEST status
    const newContact: Contact = {
      contactId: 0, // We don't know the exact ID yet, but it's not critical for UI
      userId: currentUserId.value,
      contactUserId: userId,
      username: searchResults.value.find(user => user.uid === userId)?.username || '',
      createdAt: new Date(),
      status: ContactStatus.OUTGOING_REQUEST
    };
    
    // Add to userContacts to update UI immediately
    userContacts.value.push(newContact);
    
    // Remove from pending requests
    pendingRequests.value = pendingRequests.value.filter(id => id !== userId);
  } catch (err) {
    pendingRequests.value = pendingRequests.value.filter(id => id !== userId);
    error.value = err instanceof Error ? err.message : 'Failed to add contact';
    console.error('Error adding contact:', err);
  }
}

function getContactStatus(userId: number): ContactStatus | null {
  const contact = userContacts.value.find(contact => contact.contactUserId === userId);
  return contact ? contact.status : null;
}

function isExistingContact(userId: number): boolean {
  const status = getContactStatus(userId);
  // Consider a user an existing contact if they have any status except null
  return status !== null;
}

function isPending(userId: number): boolean {
  return pendingRequests.value.includes(userId);
}

function getButtonText(userId: number): string {
  const status = getContactStatus(userId);
  
  if (isPending(userId)) {
    return 'Sending...';
  }
  
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
  const status = getContactStatus(userId);
  
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
