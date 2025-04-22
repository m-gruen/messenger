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
          @click="addContact(user.uid)" 
          variant="outline" 
          size="sm"
          :disabled="isPending(user.uid)"
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
import { ref, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api.service';
import { useAuthStore } from '@/stores/AuthStore';
import type { User } from '@/models/user-model';

const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.uid || 0);
const token = computed(() => authStore.user?.token || '');

const searchQuery = ref('');
const searchResults = ref<User[]>([]);
const loading = ref(false);
const error = ref('');
const hasSearched = ref(false);
const pendingRequests = ref<number[]>([]);

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

async function addContact(userId: number) {
  if (!currentUserId.value) {
    error.value = 'You must be logged in to add contacts';
    return;
  }
  
  try {
    pendingRequests.value.push(userId);
    await apiService.addContact(currentUserId.value, userId, token.value);
    // We don't remove from pendingRequests to keep the button disabled after successful add
  } catch (err) {
    pendingRequests.value = pendingRequests.value.filter(id => id !== userId);
    error.value = err instanceof Error ? err.message : 'Failed to add contact';
    console.error('Error adding contact:', err);
  }
}

function isPending(userId: number): boolean {
  return pendingRequests.value.includes(userId);
}

function getButtonText(userId: number): string {
  return isPending(userId) ? 'Request Sent' : 'Add Contact';
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