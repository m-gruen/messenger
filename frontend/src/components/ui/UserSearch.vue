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
const outgoingRequests = ref<Contact[]>([]);
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
    // Fetch both current contacts and outgoing requests
    const [contacts, outgoing] = await Promise.all([
      apiService.getContacts(currentUserId.value, token.value),
      apiService.getOutgoingContactRequests(currentUserId.value, token.value)
    ]);
    
    userContacts.value = contacts;
    outgoingRequests.value = outgoing;
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
  if (isExistingContact(userId)) {
    // We shouldn't get here due to disabled button, but just in case
    return;
  }
  
  if (hasPendingRequest(userId)) {
    // This is a request that's already been sent
    return;
  }
  
  await addContact(userId);
}

async function addContact(userId: number) {
  if (!currentUserId.value) {
    error.value = 'You must be logged in to add contacts';
    return;
  }
  
  try {
    pendingRequests.value.push(userId);
    await apiService.addContact(currentUserId.value, userId, token.value);
    // Add to outgoingRequests to reflect in UI immediately
    outgoingRequests.value.push({
      contactId: 0, // We don't know this yet, but it's not critical
      userId: currentUserId.value,
      contactUserId: userId,
      username: searchResults.value.find(user => user.uid === userId)?.username || '',
      createdAt: new Date(),
      status: ContactStatus.OUTGOING_REQUEST
    });
  } catch (err) {
    pendingRequests.value = pendingRequests.value.filter(id => id !== userId);
    error.value = err instanceof Error ? err.message : 'Failed to add contact';
    console.error('Error adding contact:', err);
  }
}

function isExistingContact(userId: number): boolean {
  return userContacts.value.some(contact => contact.contactUserId === userId);
}

function hasPendingRequest(userId: number): boolean {
  return outgoingRequests.value.some(request => request.contactUserId === userId);
}

function isPending(userId: number): boolean {
  return pendingRequests.value.includes(userId);
}

function getButtonText(userId: number): string {
  if (isExistingContact(userId)) {
    return 'Already Contact';
  }
  if (hasPendingRequest(userId)) {
    return 'Request Sent';
  }
  if (isPending(userId)) {
    return 'Sending...';
  }
  return 'Add Contact';
}

function getButtonVariant(userId: number): 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' {
  if (isExistingContact(userId)) {
    return 'secondary'; // Using secondary instead of success
  }
  if (hasPendingRequest(userId)) {
    return 'ghost'; // Using ghost instead of secondary
  }
  return 'outline';
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
