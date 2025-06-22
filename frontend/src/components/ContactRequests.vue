<template>
  <div class="h-full flex flex-col">
    <!-- Header with Gradient -->
    <div class="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-border/50 p-6">
      <h2 class="text-xl font-bold bg-gradient-to-r from-indigo-700 to-violet-700 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">Contact Requests</h2>
      <p class="text-slate-600 dark:text-slate-400 text-sm mt-1">Manage connection requests</p>
      
      <!-- Tabs -->
      <div class="flex mt-5 bg-slate-100/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg p-1 shadow-inner">
        <button 
          @click="activeTab = 'incoming'" 
          class="flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all duration-200 text-sm font-medium"
          :class="activeTab === 'incoming' 
            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' 
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'"
        >
          <UserPlus class="h-4 w-4" />
          Incoming
          <span v-if="contactStore.incomingRequests.length > 0" 
                class="flex items-center justify-center text-[10px] h-5 min-w-[20px] px-1 bg-indigo-600 text-white rounded-full">
            {{ contactStore.incomingRequests.length }}
          </span>
        </button>
        <button 
          @click="activeTab = 'outgoing'" 
          class="flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all duration-200 text-sm font-medium"
          :class="activeTab === 'outgoing' 
            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm' 
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'"
        >
          <Send class="h-4 w-4" />
          Outgoing
          <span v-if="contactStore.outgoingRequests.length > 0" 
                class="flex items-center justify-center text-[10px] h-5 min-w-[20px] px-1 bg-violet-600 text-white rounded-full">
            {{ contactStore.outgoingRequests.length }}
          </span>
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
        <p class="text-slate-600 dark:text-slate-300">Loading requests...</p>
      </div>

      <!-- Incoming Requests Tab -->
      <div v-else-if="activeTab === 'incoming'" class="space-y-4">
        <!-- Empty State -->
        <div v-if="contactStore.incomingRequests.length === 0" class="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 p-8 rounded-xl">
          <div class="bg-violet-100 dark:bg-violet-900/30 p-3 rounded-full mb-3">
            <UserPlus class="h-7 w-7 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 class="text-slate-700 dark:text-slate-200 font-medium mb-1">No incoming requests</h3>
          <p class="text-slate-500 dark:text-slate-400 text-sm text-center max-w-xs">
            When someone sends you a contact request, it will appear here
          </p>
        </div>

        <!-- Request List -->
        <div v-else class="space-y-3">
          <div 
            v-for="request in contactStore.incomingRequests" 
            :key="request.contactId"
            class="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/70 dark:to-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <!-- User Avatar -->
                <div class="relative">
                  <div class="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white shadow-inner">
                    <template v-if="contactStore.getUserInfo(request.contactUserId)?.profile_picture">
                      <img 
                        :src="'data:image/jpeg;base64,' + contactStore.getUserInfo(request.contactUserId)?.profile_picture" 
                        class="h-full w-full object-cover" 
                        alt="Profile" 
                      />
                    </template>
                    <template v-else>
                      <span class="text-lg font-semibold">
                        {{ (contactStore.getUserInfo(request.contactUserId)?.display_name || request.display_name || request.username).charAt(0).toUpperCase() }}
                      </span>
                    </template>
                  </div>
                </div>
                
                <!-- User Info -->
                <div>
                  <div class="font-medium text-slate-800 dark:text-slate-200">
                    {{ contactStore.getUserInfo(request.contactUserId)?.display_name || request.display_name || request.username }}
                  </div>
                  <div class="text-xs text-violet-600 dark:text-violet-400 mb-0.5" v-if="contactStore.getUserInfo(request.contactUserId)?.display_name || request.display_name">
                    @{{ contactStore.getUserInfo(request.contactUserId)?.username || request.username }}
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                    <Clock class="h-3 w-3 mr-1" />
                    {{ formatDate(request.createdAt) }}
                  </div>
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div class="flex items-center gap-2">
                <button 
                  @click="acceptRequest(request.contactUserId)"
                  class="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-sm hover:shadow-md hover:from-emerald-500 hover:to-green-600 transition-all"
                  :class="{ 'opacity-60 pointer-events-none': contactStore.isPending(request.contactUserId, 'accept') }"
                  :disabled="contactStore.isPending(request.contactUserId, 'accept')"
                  title="Accept Request"
                >
                  <Check class="h-4 w-4" />
                </button>
                <button 
                  @click="rejectRequest(request.contactUserId)"
                  class="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-sm hover:shadow-md hover:from-rose-500 hover:to-red-600 transition-all"
                  :class="{ 'opacity-60 pointer-events-none': contactStore.isPending(request.contactUserId, 'reject') }"
                  :disabled="contactStore.isPending(request.contactUserId, 'reject')"
                  title="Reject Request"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Outgoing Requests Tab -->
      <div v-else-if="activeTab === 'outgoing'" class="space-y-4">
        <!-- Empty State -->
        <div v-if="contactStore.outgoingRequests.length === 0" class="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 p-8 rounded-xl">
          <div class="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mb-3">
            <Send class="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 class="text-slate-700 dark:text-slate-200 font-medium mb-1">No outgoing requests</h3>
          <p class="text-slate-500 dark:text-slate-400 text-sm text-center max-w-xs">
            When you send someone a contact request, it will appear here
          </p>
        </div>

        <!-- Request List -->
        <div v-else class="space-y-3">
          <div 
            v-for="request in contactStore.outgoingRequests" 
            :key="request.contactId"
            class="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/70 dark:to-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <!-- User Avatar -->
                <div class="relative">
                  <div class="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center text-white shadow-inner">
                    <template v-if="contactStore.getUserInfo(request.contactUserId)?.profile_picture">
                      <img 
                        :src="'data:image/jpeg;base64,' + contactStore.getUserInfo(request.contactUserId)?.profile_picture" 
                        class="h-full w-full object-cover" 
                        alt="Profile" 
                      />
                    </template>
                    <template v-else>
                      <span class="text-lg font-semibold">
                        {{ (contactStore.getUserInfo(request.contactUserId)?.display_name || request.display_name || request.username).charAt(0).toUpperCase() }}
                      </span>
                    </template>
                  </div>
                  <!-- Status indicator -->
                  <div class="absolute -bottom-1 -right-1 bg-blue-100 text-blue-600 dark:bg-blue-900/70 dark:text-blue-400 p-1 rounded-full border-2 border-white dark:border-slate-800">
                    <Clock class="h-3 w-3" />
                  </div>
                </div>
                
                <!-- User Info -->
                <div>
                  <div class="font-medium text-slate-800 dark:text-slate-200">
                    {{ contactStore.getUserInfo(request.contactUserId)?.display_name || request.display_name || request.username }}
                  </div>
                  <div class="text-xs text-blue-600 dark:text-blue-400 mb-0.5" v-if="contactStore.getUserInfo(request.contactUserId)?.display_name || request.display_name">
                    @{{ contactStore.getUserInfo(request.contactUserId)?.username || request.username }}
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                    <Send class="h-3 w-3 mr-1" />
                    Sent: {{ formatDate(request.createdAt) }}
                  </div>
                </div>
              </div>
              
              <!-- Cancel Button -->
              <button 
                @click="cancelRequest(request.contactUserId)"
                class="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 text-white shadow-sm hover:shadow-md hover:from-slate-400 hover:to-slate-500 dark:hover:from-slate-500 dark:hover:to-slate-600 transition-all"
                :class="{ 'opacity-60 pointer-events-none': contactStore.isPending(request.contactUserId, 'cancel') }"
                :disabled="contactStore.isPending(request.contactUserId, 'cancel')"
                title="Cancel Request"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="contactStore.error" class="p-4 mx-4 mb-4 rounded-lg bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border border-rose-200 dark:border-rose-800/30">
      <div class="flex items-start gap-2">
        <AlertTriangle class="h-5 w-5 text-rose-500 dark:text-rose-400 mt-0.5 flex-shrink-0" />
        <div>
          <p class="font-medium text-rose-700 dark:text-rose-300">Error</p>
          <p class="text-sm text-rose-600 dark:text-rose-400">{{ contactStore.error }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Check, X, Clock, Send, UserPlus, AlertTriangle } from 'lucide-vue-next';
import { useContactStore } from '@/stores/ContactStore';
import { DateFormatService } from '@/services/date-format.service';

const activeTab = ref('incoming');

// Props to control when to fetch data
const props = defineProps<{
  visible: boolean;
}>();

// Contact store for managing all contact-related operations
const contactStore = useContactStore();

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    contactStore.fetchAllContacts();
  }
});

onMounted(() => {
  if (props.visible) {
    contactStore.fetchAllContacts();
  }
});

async function acceptRequest(contactUserId: number) {
  try {
    await contactStore.acceptContactRequest(contactUserId);
  } catch (err) {
    console.error('Error accepting contact request:', err);
  }
}

async function rejectRequest(contactUserId: number) {
  try {
    await contactStore.rejectContactRequest(contactUserId);
  } catch (err) {
    console.error('Error rejecting contact request:', err);
  }
}

async function cancelRequest(contactUserId: number) {
  try {
    await contactStore.cancelOutgoingRequest(contactUserId);
  } catch (err) {
    console.error('Error canceling contact request:', err);
  }
}

// Updated to use the DateFormatService class directly
function formatDate(dateValue: Date): string {
  return DateFormatService.formatContactDate(dateValue);
}
</script>

<style scoped>
/* Animation effects */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}

/* Button hover effects */
.hover\:shadow-md:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Custom styles for the backdrop blur */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}

/* Gradient backgrounds */
.bg-gradient-to-r, .bg-gradient-to-br {
  background-size: 200% auto;
  transition: background-position 0.3s ease;
}

.bg-gradient-to-r:hover, .bg-gradient-to-br:hover {
  background-position: right center;
}

/* Shadow effects */
.shadow-inner {
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
}

/* Improve button focus states for accessibility */
button:focus-visible {
  outline: 2px solid rgba(139, 92, 246, 0.5);
  outline-offset: 2px;
}
</style>
