<template>
  <div class="contact-requests-container">
    <div class="p-4 border-b">
      <h2 class="text-xl font-bold mb-1">Contact Requests</h2>
      <p class="text-sm text-muted-foreground">Manage your contact requests</p>
      
      <div class="flex mt-4 border-b">
        <button 
          @click="activeTab = 'incoming'" 
          class="py-2 px-4 font-medium text-sm" 
          :class="activeTab === 'incoming' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'"
        >
          Incoming
        </button>
        <button 
          @click="activeTab = 'outgoing'" 
          class="py-2 px-4 font-medium text-sm" 
          :class="activeTab === 'outgoing' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'"
        >
          Outgoing
        </button>
      </div>
    </div>
    
    <!-- Incoming Requests Tab -->
    <div v-if="activeTab === 'incoming'" class="p-4">
      <div v-if="loadingIncoming" class="flex items-center justify-center p-4">
        <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span class="ml-2">Loading incoming requests...</span>
      </div>
      
      <div v-else-if="incomingRequests.length === 0" class="text-muted-foreground p-4 text-center">
        No pending requests from other users.
      </div>
      
      <ul v-else class="space-y-3">
        <li v-for="request in incomingRequests" :key="request.contactId" class="p-3 rounded-md bg-accent/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {{ request.username.charAt(0).toUpperCase() }}
              </div>
              <div class="ml-3">
                <div class="font-medium">{{ request.username }}</div>
                <div class="text-xs text-muted-foreground">
                  Requested: {{ formatDate(request.createdAt) }}
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button 
                @click="acceptRequest(request.contactUserId)" 
                class="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                :class="{ 'opacity-50 cursor-not-allowed': isPending(request.contactUserId, 'accept') }"
                :disabled="isPending(request.contactUserId, 'accept')"
              >
                <Check class="w-4 h-4" />
              </button>
              <button 
                @click="rejectRequest(request.contactUserId)" 
                class="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                :class="{ 'opacity-50 cursor-not-allowed': isPending(request.contactUserId, 'reject') }"
                :disabled="isPending(request.contactUserId, 'reject')"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    
    <!-- Outgoing Requests Tab -->
    <div v-if="activeTab === 'outgoing'" class="p-4">
      <div v-if="loadingOutgoing" class="flex items-center justify-center p-4">
        <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span class="ml-2">Loading outgoing requests...</span>
      </div>
      
      <div v-else-if="outgoingRequests.length === 0" class="text-muted-foreground p-4 text-center">
        No pending requests to other users.
      </div>
      
      <ul v-else class="space-y-3">
        <li v-for="request in outgoingRequests" :key="request.contactId" class="p-3 rounded-md bg-accent/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {{ request.username.charAt(0).toUpperCase() }}
              </div>
              <div class="ml-3">
                <div class="font-medium">{{ request.username }}</div>
                <div class="text-xs text-muted-foreground">
                  Sent: {{ formatDate(request.createdAt) }}
                </div>
              </div>
            </div>
            <div>
              <button 
                @click="cancelRequest(request.contactUserId)" 
                class="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                :class="{ 'opacity-50 cursor-not-allowed': isPending(request.contactUserId, 'cancel') }"
                :disabled="isPending(request.contactUserId, 'cancel')"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
    
    <div v-if="error" class="bg-destructive/10 text-destructive p-4 m-4 rounded-md">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Check, X } from 'lucide-vue-next';
import { apiService } from '@/services/api.service';
import { useAuthStore } from '@/stores/AuthStore';
import type { Contact } from '@/models/contact-model';

const authStore = useAuthStore();
const currentUserId = computed(() => authStore.user?.uid || 0);
const token = computed(() => authStore.user?.token || '');

const incomingRequests = ref<Contact[]>([]);
const outgoingRequests = ref<Contact[]>([]);
const loadingIncoming = ref(false);
const loadingOutgoing = ref(false);
const error = ref('');
const activeTab = ref('incoming');

// Track pending operations
const pendingOperations = ref<{[key: number]: {[action: string]: boolean}}>({});

// Props to control when to fetch data
const props = defineProps<{
  visible: boolean;
}>();

watch(() => props.visible, (isVisible) => {
  if (isVisible && currentUserId.value) {
    fetchRequests();
  }
});

onMounted(async () => {
  if (props.visible && currentUserId.value) {
    await fetchRequests();
  }
});

async function fetchRequests() {
  await Promise.all([
    fetchIncomingRequests(),
    fetchOutgoingRequests()
  ]);
}

async function fetchIncomingRequests() {
  if (!currentUserId.value) return;
  
  loadingIncoming.value = true;
  error.value = '';
  
  try {
    incomingRequests.value = await apiService.getIncomingContactRequests(currentUserId.value, token.value);
  } catch (err) {
    console.error('Error fetching incoming contact requests:', err);
    error.value = err instanceof Error ? err.message : 'Failed to fetch incoming requests';
  } finally {
    loadingIncoming.value = false;
  }
}

async function fetchOutgoingRequests() {
  if (!currentUserId.value) return;
  
  loadingOutgoing.value = true;
  error.value = '';
  
  try {
    outgoingRequests.value = await apiService.getOutgoingContactRequests(currentUserId.value, token.value);
  } catch (err) {
    console.error('Error fetching outgoing contact requests:', err);
    error.value = err instanceof Error ? err.message : 'Failed to fetch outgoing requests';
  } finally {
    loadingOutgoing.value = false;
  }
}

async function acceptRequest(contactUserId: number) {
  if (!currentUserId.value) return;
  
  setPendingOperation(contactUserId, 'accept', true);
  error.value = '';
  
  try {
    await apiService.acceptContactRequest(currentUserId.value, contactUserId, token.value);
    // Remove from incoming requests
    incomingRequests.value = incomingRequests.value.filter(request => request.contactUserId !== contactUserId);
  } catch (err) {
    console.error('Error accepting contact request:', err);
    error.value = err instanceof Error ? err.message : 'Failed to accept request';
  } finally {
    setPendingOperation(contactUserId, 'accept', false);
  }
}

async function rejectRequest(contactUserId: number) {
  if (!currentUserId.value) return;
  
  setPendingOperation(contactUserId, 'reject', true);
  error.value = '';
  
  try {
    await apiService.rejectContactRequest(currentUserId.value, contactUserId, token.value);
    // Remove from incoming requests
    incomingRequests.value = incomingRequests.value.filter(request => request.contactUserId !== contactUserId);
  } catch (err) {
    console.error('Error rejecting contact request:', err);
    error.value = err instanceof Error ? err.message : 'Failed to reject request';
  } finally {
    setPendingOperation(contactUserId, 'reject', false);
  }
}

async function cancelRequest(contactUserId: number) {
  if (!currentUserId.value) return;
  
  setPendingOperation(contactUserId, 'cancel', true);
  error.value = '';
  
  try {
    await apiService.deleteContact(currentUserId.value, contactUserId, token.value);
    // Remove from outgoing requests
    outgoingRequests.value = outgoingRequests.value.filter(request => request.contactUserId !== contactUserId);
  } catch (err) {
    console.error('Error canceling contact request:', err);
    error.value = err instanceof Error ? err.message : 'Failed to cancel request';
  } finally {
    setPendingOperation(contactUserId, 'cancel', false);
  }
}

function setPendingOperation(contactUserId: number, action: string, value: boolean) {
  if (!pendingOperations.value[contactUserId]) {
    pendingOperations.value[contactUserId] = {};
  }
  pendingOperations.value[contactUserId][action] = value;
}

function isPending(contactUserId: number, action: string): boolean {
  return !!pendingOperations.value[contactUserId]?.[action];
}

function formatDate(dateValue: Date): string {
  if (!dateValue) return 'Unknown';
  
  const date = new Date(dateValue);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
</script>

<style scoped>
.contact-requests-container {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
</style>
