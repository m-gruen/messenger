<script setup lang="ts">
import { defineProps, defineEmits, ref, watch, onMounted, computed } from 'vue'
import { useMessageStore } from '@/stores/MessageStore'
import ChatInterface from './ChatInterface.vue'
import ContactDetails from './ContactDetails.vue'
import type { Contact } from '@/models/contact-model'
import { ContactStatus } from '@/models/contact-model'
import { useContactStore } from '@/stores/ContactStore'
import { storageService } from '@/services/storage.service.ts'

const props = defineProps({
  contact: {
    type: Object as () => Contact,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  },
  leftPosition: {
    type: String,
    required: true
  },
  width: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

// Contact store
const contactStore = useContactStore()

// Message store
const messageStore = useMessageStore()

// UI state
const showContactDetails = ref(false)
const showChat = ref(props.visible) // Initialize with visible prop

// Image preview state
const showImagePreview = ref(false)
const previewImageSrc = ref<string | null>(null)

// Function to handle image preview
function handleViewImage(src: string | null) {
  if (src) {
    previewImageSrc.value = src;
    showImagePreview.value = true;
  }
}

// Function to close image preview
function closeImagePreview() {
  showImagePreview.value = false;
  previewImageSrc.value = null;
}

// Contact action states
const isRemovingContact = ref(false)
const isBlockingContact = ref(false)
const isUnblockingContact = ref(false)
const contactActionError = ref<string | undefined>(undefined)
const removalSuccess = ref(false)
const blockSuccess = ref(false)
const unblockSuccess = ref(false)

// Contact details panel width in pixels - fixed value for consistency
const contactDetailsWidth = 320 // 320px (w-80)

// Dynamic chat width when contact details are shown
const chatWidth = computed(() => {
  if (showContactDetails.value) {
    // When contact details are shown, subtract their width from the total available width
    return `calc(${props.width} - ${contactDetailsWidth}px)`
  }
  // Otherwise use full width as provided by parent
  return props.width
})

// Load messages immediately when component is mounted if visible and has contact
onMounted(() => {
  if (showChat.value && props.contact && props.contact.contactUserId) {
    loadMessages()
  }
})

// Watch for visibility changes
watch(() => props.visible, (isVisible) => {
  showChat.value = isVisible
  if (isVisible && props.contact) {
    loadMessages()
  }
})

// Watch for contact changes
watch(() => props.contact, (newContact) => {
  if (newContact && showChat.value) {
    loadMessages()
  }
})

// Pagination variables for message loading
const currentPage = ref(0)
const messagesPerPage = ref(50)
const totalPages = ref(0)
const isLoadingMoreMessages = ref(false)

// Method to load more messages when scrolling up
const loadMoreMessages = async () => {
  const totalPages = messageStore.totalMessagePages;
  const currentPage = messageStore.currentMessagePage;
  
  if (currentPage >= totalPages - 1 || isLoadingMoreMessages.value) {
    return;
  }
  
  isLoadingMoreMessages.value = true;
  
  try {
    // Load the next page of messages
    await messageStore.loadPaginatedMessages(
      props.contact.contactUserId, 
      currentPage + 1, 
      messagesPerPage.value
    );
  } catch (error) {
    console.error('Error loading more messages:', error);
  } finally {
    isLoadingMoreMessages.value = false;
  }
};

// Reset pagination when contact changes
watch(() => props.contact.contactUserId, () => {
  currentPage.value = 0;
  totalPages.value = 0;
});

// Method to initialize pagination data
const initMessagePagination = () => {
  const userId = storageService.getUser()?.uid;
  if (!userId) return;
  
  const paginationInfo = storageService.getMessagesForContactPaginated(
    userId,
    props.contact.contactUserId,
    0,
    messagesPerPage.value
  );
  
  messageStore.setTotalMessagePages(paginationInfo.totalPages);
};

// Initialize pagination at mount time
onMounted(() => {
  if (props.contact && props.contact.contactUserId) {
    initMessagePagination();
  }
});

function loadMessages() {
  if (props.contact && props.contact.contactUserId) {
    messageStore.clearMessages();
    // Use paginated loading instead of fetchMessages
    messageStore.loadPaginatedMessages(props.contact.contactUserId, 0, messagesPerPage.value);
    initMessagePagination();
  }
}

async function sendMessage(content: string) {
  if (!props.contact || !props.contact.contactUserId) return
  
  try {
    await messageStore.sendMessage(props.contact.contactUserId, content)
  } catch (err) {
    console.error('Error sending message:', err)
  }
}

async function removeContact() {
  if (!props.contact || !props.contact.contactUserId) return
  
  isRemovingContact.value = true
  contactActionError.value = undefined
  
  try {
    await contactStore.deleteContact(props.contact.contactUserId)
    
    // Record success for UI feedback
    removalSuccess.value = true
    
    // Close all related UI elements after a short delay
    setTimeout(() => {
      showContactDetails.value = false
      showChat.value = false
      removalSuccess.value = false // Reset the success flag
      emit('close')
      
      // Refresh contacts list
      contactStore.fetchAllContacts()
    }, 1500)
  } catch (err) {
    contactActionError.value = err instanceof Error ? err.message : 'Failed to remove contact'
    console.error('Error removing contact:', err)
  } finally {
    isRemovingContact.value = false
  }
}

async function blockContact() {
  if (!props.contact || !props.contact.contactUserId) return
  
  isBlockingContact.value = true
  contactActionError.value = undefined
  
  try {
    await contactStore.blockContact(props.contact.contactUserId)
    
    // Record success for UI feedback
    blockSuccess.value = true
    
    // Reset success flag after a short delay
    setTimeout(() => {
      blockSuccess.value = false
    }, 3000)
  } catch (err) {
    contactActionError.value = err instanceof Error ? err.message : 'Failed to block contact'
    console.error('Error blocking contact:', err)
  } finally {
    isBlockingContact.value = false
  }
}

async function unblockContact() {
  if (!props.contact || !props.contact.contactUserId) return
  
  isUnblockingContact.value = true
  contactActionError.value = undefined
  
  try {
    await contactStore.unblockContact(props.contact.contactUserId)
    
    // Record success for UI feedback
    unblockSuccess.value = true
    
    // Reset success flag after a short delay
    setTimeout(() => {
      unblockSuccess.value = false
    }, 3000)
  } catch (err) {
    contactActionError.value = err instanceof Error ? err.message : 'Failed to unblock contact'
    console.error('Error unblocking contact:', err)
  } finally {
    isUnblockingContact.value = false
  }
}

function toggleContactDetails() {
  showContactDetails.value = !showContactDetails.value
}

function goBack() {
  showChat.value = false
  // Optimize message storage when closing the chat
  const userId = storageService.getUser()?.uid;
  if (userId) {
    messageStore.optimizeMessageStorage(userId, props.contact.contactUserId);
  }
  emit('close')
}

// Helper function to check if contact is blocked
function isContactBlocked(): boolean {
  return props.contact?.status === ContactStatus.BLOCKED;
}
</script>

<template>
  <div v-if="showChat" class="relative">
    <!-- Chat Interface -->
    <ChatInterface 
      :contact="contact"
      :messages="messageStore.messages"
      :is-loading-messages="messageStore.isLoading || isLoadingMoreMessages"
      :messages-error="messageStore.error"
      :send-error="messageStore.sendError"
      :current-user-id="messageStore.currentUserId"
      :left-position="leftPosition"
      :width="chatWidth"
      @back="goBack"
      @toggle-details="toggleContactDetails"
      @send-message="sendMessage"
      @clear-send-error="messageStore.clearSendError"
      @load-more-messages="loadMoreMessages"
      @view-image="handleViewImage"
    />

    <!-- Contact Details (positioned adjacent to chat instead of on top) -->
    <ContactDetails
      :contact="contact"
      :show="showContactDetails"
      :is-removing="isRemovingContact"
      :is-blocking="isBlockingContact"
      :is-unblocking="isUnblockingContact"
      :action-error="contactActionError"
      :removal-success="removalSuccess"
      :block-success="blockSuccess"
      :unblock-success="unblockSuccess"
      :is-blocked="isContactBlocked()"
      @close="toggleContactDetails"
      @remove="removeContact"
      @block="blockContact"
      @unblock="unblockContact"
      @cancel-remove="() => {}" 
    />

    <!-- Image Preview Modal -->
    <div v-if="showImagePreview && previewImageSrc" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <span class="absolute top-4 right-4 cursor-pointer close-button" @click="closeImagePreview">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
      <img :src="previewImageSrc" class="max-w-full max-h-full object-contain" />
    </div>
  </div>
</template>

<style scoped>
/* Image preview styling */
.image-preview-overlay {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.close-button {
  transition: transform 0.2s;
}

.close-button:hover {
  transform: scale(1.1);
}
</style>
