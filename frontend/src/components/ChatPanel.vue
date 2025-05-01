<script setup lang="ts">
import { defineProps, defineEmits, ref, watch } from 'vue'
import { useMessageStore } from '@/stores/MessageStore'
import ChatInterface from './ChatInterface.vue'
import ContactDetails from './ContactDetails.vue'
import type { Contact } from '@/models/contact-model'
import { useContactStore } from '@/stores/ContactStore'

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

// Contact removal state
const isRemovingContact = ref(false)
const removalError = ref<string | undefined>(undefined)
const removalSuccess = ref(false)

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
  removalError.value = undefined
  
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
    removalError.value = err instanceof Error ? err.message : 'Failed to remove contact'
    console.error('Error removing contact:', err)
  } finally {
    isRemovingContact.value = false
  }
}

function toggleContactDetails() {
  showContactDetails.value = !showContactDetails.value
}

function goBack() {
  showChat.value = false
  emit('close')
}
</script>

<template>
  <div v-if="showChat">
    <!-- Chat Interface -->
    <ChatInterface 
      :contact="contact"
      :messages="messageStore.messages"
      :is-loading-messages="messageStore.isLoading"
      :messages-error="messageStore.error"
      :current-user-id="messageStore.currentUserId"
      :left-position="leftPosition"
      :width="width"
      @back="goBack"
      @toggle-details="toggleContactDetails"
      @send-message="sendMessage"
    />

    <!-- Contact Details -->
    <ContactDetails
      :contact="contact"
      :show="showContactDetails"
      :is-removing="isRemovingContact"
      :removal-error="removalError"
      :removal-success="removalSuccess"
      @close="toggleContactDetails"
      @remove="removeContact"
      @cancel-remove="() => {}" 
    />
    <!-- Empty handler as it's handled within ContactDetails -->
  </div>
</template>