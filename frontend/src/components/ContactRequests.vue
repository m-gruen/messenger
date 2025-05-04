<template>
  <div class="contact-requests-container">
    <div class="p-4 border-b">
      <h2 class="text-xl font-bold mb-1">Contact Requests</h2>
      <p class="text-sm text-muted-foreground">Manage your contact requests</p>

      <div class="flex mt-4 border-b">
        <button @click="activeTab = 'incoming'" class="py-2 px-4 font-medium text-sm"
          :class="activeTab === 'incoming' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'">
          Incoming
        </button>
        <button @click="activeTab = 'outgoing'" class="py-2 px-4 font-medium text-sm"
          :class="activeTab === 'outgoing' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'">
          Outgoing
        </button>
      </div>
    </div>

    <!-- Incoming Requests Tab -->
    <div v-if="activeTab === 'incoming'" class="p-4">
      <div v-if="contactStore.loading" class="flex items-center justify-center p-4">
        <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span class="ml-2">Loading incoming requests...</span>
      </div>

      <div v-else-if="contactStore.incomingRequests.length === 0" class="text-muted-foreground p-4 text-center">
        No pending requests from other users.
      </div>

      <ul v-else class="space-y-3">
        <li v-for="request in contactStore.incomingRequests" :key="request.contactId"
          class="p-3 rounded-md bg-accent/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {{ (request.display_name || request.username).charAt(0).toUpperCase() }}
              </div>
              <div class="ml-3">
                <div class="font-medium">{{ request.display_name || request.username }}</div>
                <div class="text-xs text-muted-foreground">
                  <span v-if="request.display_name" class="opacity-70 mr-2">@{{ request.username }}</span>
                  Requested: {{ formatDate(request.createdAt) }}
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="acceptRequest(request.contactUserId)"
                class="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
                :class="{ 'opacity-50 cursor-not-allowed': contactStore.isPending(request.contactUserId, 'accept') }"
                :disabled="contactStore.isPending(request.contactUserId, 'accept')">
                <Check class="w-4 h-4" />
              </button>
              <button @click="rejectRequest(request.contactUserId)"
                class="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                :class="{ 'opacity-50 cursor-not-allowed': contactStore.isPending(request.contactUserId, 'reject') }"
                :disabled="contactStore.isPending(request.contactUserId, 'reject')">
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Outgoing Requests Tab -->
    <div v-if="activeTab === 'outgoing'" class="p-4">
      <div v-if="contactStore.loading" class="flex items-center justify-center p-4">
        <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span class="ml-2">Loading outgoing requests...</span>
      </div>

      <div v-else-if="contactStore.outgoingRequests.length === 0" class="text-muted-foreground p-4 text-center">
        No pending requests to other users.
      </div>

      <ul v-else class="space-y-3">
        <li v-for="request in contactStore.outgoingRequests" :key="request.contactId"
          class="p-3 rounded-md bg-accent/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {{ (request.display_name || request.username).charAt(0).toUpperCase() }}
              </div>
              <div class="ml-3">
                <div class="font-medium">{{ request.display_name || request.username }}</div>
                <div class="text-xs text-muted-foreground">
                  <span v-if="request.display_name" class="opacity-70 mr-2">@{{ request.username }}</span>
                  Sent: {{ formatDate(request.createdAt) }}
                </div>
              </div>
            </div>
            <div>
              <button @click="cancelRequest(request.contactUserId)"
                class="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                :class="{ 'opacity-50 cursor-not-allowed': contactStore.isPending(request.contactUserId, 'cancel') }"
                :disabled="contactStore.isPending(request.contactUserId, 'cancel')">
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="contactStore.error" class="bg-destructive/10 text-destructive p-4 m-4 rounded-md">
      {{ contactStore.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Check, X } from 'lucide-vue-next';
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
.contact-requests-container {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
</style>
