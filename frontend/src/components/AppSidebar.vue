<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import SidebarNavigation from '@/components/SidebarNavigation.vue'
import UserSearch from '@/components/UserSearch.vue'
import ContactRequests from '@/components/ContactRequests.vue'
import ContactList from '@/components/ContactList.vue'
import UserSettings from '@/components/UserSettings.vue'
import type { Contact } from '@/models/contact-model';
import { storageService } from '@/services/storage.service';
import { useContactStore } from '@/stores/ContactStore';
import ChatPanel from '@/components/ChatPanel.vue'
import { ArrowLeft } from 'lucide-vue-next'

// Get user ID from storage service
const user = storageService.getUser()
const currentUserId = computed(() => user?.uid || 0)

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
  showChat.value = true
}

function closeChat() {
  showChat.value = false
  selectedContact.value = null
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
      @toggle-settings="toggleUserSettings"
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

    <!-- User Settings Panel -->
    <div v-if="showUserSettings"
      class="fixed z-10 top-0 bottom-0 overflow-hidden bg-card transition-all duration-300 ease-in-out"
      :style="{ left: sidebarWidth, right: '0' }">
      <!-- Back button header -->
      <div class="p-3 border-b flex items-center bg-card z-50 sticky top-0">
        <button 
          @click="toggleUserSettings" 
          class="p-2 rounded-md hover:bg-background/80 mr-2"
          aria-label="Return to application"
        >
          <ArrowLeft class="h-5 w-5" />
        </button>
        <h1 class="font-medium">User Settings</h1>
      </div>
      
      <div class="h-[calc(100vh-56px)] overflow-y-auto">
        <UserSettings />
      </div>
    </div>

    <!-- Chat Panel - Use our new component -->
    <ChatPanel
      v-if="selectedContact"
      :contact="selectedContact"
      :visible="showChat"
      :left-position="chatLeftPosition"
      :width="chatWidth"
      @close="closeChat"
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
