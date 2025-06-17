<script setup lang="ts">
import { defineProps, defineEmits, ref, watch, onMounted, computed } from 'vue'
import { useMessageStore } from '@/stores/MessageStore'
import ChatInterface from './ChatInterface.vue'
import ContactDetails from '../contact/ContactDetails.vue'
import type { Contact } from '@/models/contact-model'
import { ContactStatus } from '@/models/contact-model'
import { useContactStore } from '@/stores/ContactStore'
import { storageService } from '@/services/storage.service.ts'
import { messageContentService } from '@/services/message-content.service'
import { Code } from 'lucide-vue-next'
import 'highlight.js/styles/atom-one-dark.css' // Import the same theme used in MessageList

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

const contactStore = useContactStore()
const messageStore = useMessageStore()

const showContactDetails = ref(false)
const showChat = ref(props.visible)

const showImagePreview = ref(false)
const previewImageSrc = ref<string | null>(null)

const showCodePreview = ref(false)
const previewCodeContent = ref<string | null>(null)
const previewCodeLanguage = ref<string | null>(null)
const previewCodeName = ref<string | null>(null)

function handleViewImage(src: string | null) {
  if (src) {
    previewImageSrc.value = src;
    showImagePreview.value = true;
  }
}
function closeImagePreview() {
  showImagePreview.value = false;
  previewImageSrc.value = null;
}

// Using message content service for decoding HTML entities
function decodeHtmlEntities(text: string): string {
  return messageContentService.decodeHtmlEntities(text);
}

// Handler for code snippet previews
function handleViewCode(codeContent: string, language: string, name: string) {
  if (codeContent) {
    // Decode HTML entities to ensure quotes display properly
    previewCodeContent.value = decodeHtmlEntities(codeContent);
    previewCodeLanguage.value = language;
    previewCodeName.value = name;
    showCodePreview.value = true;
  }
}

// Close code snippet preview
function closeCodePreview() {
  showCodePreview.value = false;
  previewCodeContent.value = null;
  previewCodeLanguage.value = null;
  previewCodeName.value = null;
}

const isRemovingContact = ref(false)
const isBlockingContact = ref(false)
const isUnblockingContact = ref(false)
const contactActionError = ref<string | undefined>(undefined)
const removalSuccess = ref(false)
const blockSuccess = ref(false)
const unblockSuccess = ref(false)

const contactDetailsWidth = 320
const chatWidth = computed(() => {
  if (showContactDetails.value) {
    return `calc(${props.width} - ${contactDetailsWidth}px)`
  }
  return props.width
})

onMounted(async () => {
  if (showChat.value && props.contact && props.contact.contactUserId) {
    await loadMessages()
  }
})
watch(() => props.visible, async (isVisible) => {
  showChat.value = isVisible
  if (isVisible && props.contact) {
    await loadMessages()
  }
})

watch(() => props.contact, async (newContact) => {
  if (newContact && showChat.value) {
    await loadMessages()
  }
})
const currentPage = ref(0)
const messagesPerPage = ref(50)
const totalPages = ref(0)
const isLoadingMoreMessages = ref(false)
const loadMoreMessages = async () => {
  const totalPages = messageStore.totalMessagePages;
  const currentPage = messageStore.currentMessagePage;
  
  if (currentPage >= totalPages - 1 || isLoadingMoreMessages.value) {
    return;
  }
  
  isLoadingMoreMessages.value = true;
  
  try {
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
watch(() => props.contact.contactUserId, () => {
  currentPage.value = 0;
  totalPages.value = 0;
});
const initMessagePagination = async () => {
  const userId = storageService.getUser()?.uid;
  if (!userId) return;
  
  const paginationInfo = await storageService.getMessagesForContactPaginated(
    userId,
    props.contact.contactUserId,
    0,
    messagesPerPage.value
  );
  
  messageStore.setTotalMessagePages(paginationInfo.totalPages);
};
onMounted(async () => {
  if (props.contact && props.contact.contactUserId) {
    await initMessagePagination();
  }
});

async function loadMessages() {
  if (props.contact && props.contact.contactUserId) {
    messageStore.clearMessages();
    await messageStore.loadPaginatedMessages(props.contact.contactUserId, 0, messagesPerPage.value);
    await initMessagePagination();
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

// Use the formatCode method from our service
function formatCode(code: string, language: string): string {
  return messageContentService.formatCode(code, language);
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
      @view-code="handleViewCode"
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
    <div v-if="showImagePreview && previewImageSrc" 
         class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
         @click="closeImagePreview">
      <span class="absolute top-4 right-4 cursor-pointer close-button" @click.stop="closeImagePreview">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
      <img :src="previewImageSrc" class="max-w-full max-h-full object-contain" @click.stop />
    </div>

    <!-- Code Preview Modal -->
    <div v-if="showCodePreview && previewCodeContent" 
         class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
         @click="closeCodePreview">
      <span class="absolute top-4 right-4 cursor-pointer close-button" @click.stop="closeCodePreview">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
      <div class="w-4/5 max-h-[90vh] flex flex-col bg-zinc-900 overflow-auto" @click.stop>
        <!-- Code info bar (optional) -->
        <div class="bg-zinc-800 p-3 flex items-center">
          <Code class="h-5 w-5 mr-2 text-blue-400" />
          <div class="code-name font-medium truncate text-white">
            {{ previewCodeName }}
          </div>
          <div class="code-language text-xs opacity-70 ml-2 text-white">
            {{ previewCodeLanguage }}
          </div>
        </div>
        <!-- Code content -->
        <pre class="m-0 p-6 bg-zinc-900 overflow-x-auto"><code v-html="previewCodeContent ? formatCode(previewCodeContent, previewCodeLanguage || '') : ''"></code></pre>
      </div>
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
  transition: transform 0.2s, opacity 0.2s;
}

.close-button:hover {
  transform: scale(1.1);
  opacity: 0.9;
}

/* Code preview modal styles */
.code-name {
  max-width: 60%;
}

/* Ensure the header stays on top when scrolling */
.sticky {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
