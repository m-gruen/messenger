<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import SidebarNavigation from '@/components/SidebarNavigation.vue'
import UserSearch from '@/components/UserSearch.vue'
import ContactRequests from '@/components/ContactRequests.vue'
import ContactList from '@/components/ContactList.vue'
import UserSettings from '@/components/UserSettings.vue'
import type { IMessage } from '@/models/message-model';
import type { Contact } from '@/models/contact-model';
import { ContactStatus } from '@/models/contact-model';
import { apiService } from '@/services/api.service';
import { storageService } from '@/services/storage.service';
import { useContactStore } from '@/stores/ContactStore';

import {
  Home, Inbox, Search, Settings, ChevronRight,
  ChevronLeft, MessageSquare, UserPlus,
  Send, ArrowLeft
} from "lucide-vue-next"
import ContactDetails from '@/components/ContactDetails.vue'
import ChatInterface from '@/components/ChatInterface.vue'
import type { IMessage } from '@/models/message-model'
import type { Contact } from '@/models/contact-model'
import { apiService } from '@/services/api.service'
import { storageService } from '@/services/storage.service'
import { useContactStore } from '@/stores/ContactStore'

// Get user ID and token from storage service
const user = storageService.getUser()
const currentUserId = computed(() => user?.uid || 0)
const token = computed(() => storageService.getToken() || '')

// Contact store
const contactStore = useContactStore()

// UI state
const showContacts = ref(false)
const showRequests = ref(false)
const showSearch = ref(false)
const showUserSettings = ref(false);
const sidebarCollapsed = ref(false)
const selectedContact = ref<Contact | null>(null)
const showChat = ref(false)
const showContactDetails = ref(false)

// Chat state
const messages = ref<IMessage[]>([])
const isLoadingMessages = ref(false)
const messagesError = ref<string | undefined>(undefined)

// Contact removal state
const isRemovingContact = ref(false)
const removalError = ref<string | undefined>(undefined)
const removalSuccess = ref(false)

// Computed properties for positional styling
const sidebarWidth = computed(() => sidebarCollapsed.value ? '48px' : '240px')
const panelWidth = '320px' // Fixed width for all panels (w-80 = 20rem = 320px)

// Calculate chat window position and width as computed properties
const chatLeftPosition = computed(() => {
  if (showContacts.value || showRequests.value || showSearch.value) {
    return `calc(${sidebarWidth.value} + ${panelWidth})`
  }
  return sidebarWidth.value
})

const chatWidth = computed(() => {
  return `calc(100vw - ${chatLeftPosition.value})`
})

onMounted(async () => {
  if (currentUserId.value) {
    await contactStore.fetchAllContacts()
  }
})

// Re-fetch contacts when needed sections are toggled visible
watch(showContacts, async (isVisible) => {
  if (isVisible && currentUserId.value) {
    await contactStore.fetchAllContacts()
  }
})

async function fetchMessages(userId: number, contactId: number) {
  messagesError.value = undefined
  isLoadingMessages.value = true
  
  try {
    messages.value = await apiService.getMessages(userId, contactId, token.value)
    
    messages.value = messages.value.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
    
    setTimeout(() => {
      const messageContainer = document.querySelector('.flex.flex-col-reverse.space-y-reverse.space-y-4')
      if (messageContainer) {
        messageContainer.scrollIntoView({
          behavior: 'instant',
          block: 'end',
          inline: 'nearest'
        })
      }
    }, 0)
  } catch (err) {
    messagesError.value = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Error fetching messages:', err)
  } finally {
    isLoadingMessages.value = false
  }
}

async function sendMessage(content: string) {
  if (!content.trim() || !selectedContact.value) return
  
  try {
    const sentMessage = await apiService.sendMessage(
      currentUserId.value,
      selectedContact.value.contactUserId,
      content,
      token.value
    )
    
    messages.value.push(sentMessage)
    fetchMessages(currentUserId.value, selectedContact.value.contactUserId)
  } catch (err) {
    messagesError.value = err instanceof Error ? err.message : 'Failed to send message'
    console.error('Error sending message:', err)
  }
}

async function removeContact() {
  if (!selectedContact.value || !currentUserId.value) return
  
  try {
    isRemovingContact.value = true
    removalError.value = undefined
    
    await apiService.deleteContact(
      currentUserId.value,
      selectedContact.value.contactUserId,
      token.value
    )
    
    // Record success for UI feedback
    removalSuccess.value = true
    
    // Close all related UI elements after a short delay
    setTimeout(() => {
      showContactDetails.value = false
      showChat.value = false
      selectedContact.value = null
      removalSuccess.value = false // Reset the success flag
      
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

function toggleUserSettings() {
  showUserSettings.value = !showUserSettings.value;
  if (showUserSettings.value) {
    showContacts.value = false;
    showSearch.value = false;
    showRequests.value = false;
  }
  showChat.value = false;
}

function toggleContacts() {
  showContacts.value = !showContacts.value
  if (showContacts.value) {
    // Close other panels if contacts is opened
    showSearch.value = false
    showRequests.value = false
    showUserSettings.value = false;
  }
  showChat.value = false
}

function toggleRequests() {
  showRequests.value = !showRequests.value
  if (showRequests.value) {
    // Close other panels if requests is opened
    showContacts.value = false
    showSearch.value = false
    showUserSettings.value = false;
  }
  showChat.value = false
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  // Close other panels if search is opened
  if (showSearch.value) {
    showContacts.value = false
    showRequests.value = false
    showUserSettings.value = false;
  }
  showChat.value = false
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  document.documentElement.style.setProperty(
    '--sidebar-width',
    sidebarCollapsed.value ? '48px' : '240px'
  )
}

function selectContact(contact: Contact) {
  selectedContact.value = contact
  messages.value = []
  showChat.value = true

  if (contact && contact.userId) {
    fetchMessages(currentUserId.value, contact.contactUserId)
  } else {
    console.error('Invalid contact selected, missing userId')
    messagesError.value = 'Cannot load messages: Invalid contact'
  }
}

function toggleContactDetails() {
  showContactDetails.value = !showContactDetails.value
}

function cancelRemoveContact() {
  // This is now handled within the ContactDetails component
}
</script>

<template>
  <div class="flex">
    <!-- Left Sidebar Navigation -->
    <SidebarNavigation 
      :collapsed="sidebarCollapsed"
      @toggle-collapsed="toggleSidebar"
      @toggle-contacts="toggleContacts"
      @toggle-requests="toggleRequests"
      @toggle-search="toggleSearch"
    />

    <!-- Contacts List Panel -->
    <div v-if="showContacts"
      class="fixed z-10 top-0 bottom-0 overflow-y-auto border-r border-border bg-card transition-all duration-300 ease-in-out"
      :style="{ left: sidebarWidth }" :class="{ 'w-80': true }">
      <ContactList :visible="showContacts" @select="selectContact" />
    </div>

    <!-- Contact Requests Panel -->
    <div v-if="showRequests"
      class="fixed z-10 top-0 bottom-0 overflow-y-auto border-r border-border bg-card transition-all duration-300 ease-in-out"
      :style="{ left: sidebarWidth }" :class="{ 'w-80': true }">
      <ContactRequests :visible="showRequests" />
    </div>

    <!-- User Search Panel -->
    <div v-if="showSearch"
      class="fixed z-10 top-0 bottom-0 overflow-y-auto border-r border-border bg-card transition-all duration-300 ease-in-out"
      :style="{ left: sidebarWidth }" :class="{ 'w-80': true }">
      <div class="p-4 border-b">
        <h2 class="text-xl font-bold mb-1">Find Contacts</h2>
        <p class="text-sm text-muted-foreground">Search for users to add as contacts</p>
      </div>
      <UserSearch />
    </div>

    <!-- Chat Interface -->
    <ChatInterface 
      v-if="selectedContact && showChat"
      :contact="selectedContact"
      :messages="messages"
      :is-loading-messages="isLoadingMessages"
      :messages-error="messagesError"
      :current-user-id="currentUserId"
      :left-position="chatLeftPosition"
      :width="chatWidth"
      @back="showChat = false"
      @toggle-details="toggleContactDetails"
      @send-message="sendMessage"
    />

    <!-- Contact Details -->
    <ContactDetails
      v-if="selectedContact"
      :contact="selectedContact"
      :show="showContactDetails"
      :is-removing="isRemovingContact"
      :removal-error="removalError"
      :removal-success="removalSuccess"
      @close="toggleContactDetails"
      @remove="removeContact"
      @cancel-remove="cancelRemoveContact"
    />
  </div>
</template>

<style>
:root {
  --sidebar-width: 240px;
}

[data-collapsed=true] {
  --sidebar-width: 48px;
}

[data-collapsed=true] [data-tooltip] {
  position: relative;
}

[data-collapsed=true] [data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  background-color: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
  padding: 0.5rem;
  border-radius: 0.25rem;
  z-index: 50;
  margin-left: 0.5rem;
  white-space: nowrap;
}
</style>
