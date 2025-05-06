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

function loadMessages() {
  if (props.contact && props.contact.contactUserId) {
    messageStore.clearMessages()
    messageStore.fetchMessages(props.contact.contactUserId)
    messageStore.storeMessagesOnDevice(storageService.getUser()!.uid);
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
      :is-loading-messages="messageStore.isLoading"
      :messages-error="messageStore.error"
      :send-error="messageStore.sendError"
      :current-user-id="messageStore.currentUserId"
      :left-position="leftPosition"
      :width="chatWidth"
      @back="goBack"
      @toggle-details="toggleContactDetails"
      @send-message="sendMessage"
      @clear-send-error="messageStore.clearSendError"
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
  </div>
</template>
