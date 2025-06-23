<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import SidebarNavigation from '@/components/navigation/SidebarNavigation.vue'
import UserSearch from '@/components/UserSearch.vue'
import ContactRequests from '@/components/ContactRequests.vue'
import ContactList from '@/components/contact/ContactList.vue'
import UserSettings from '@/components/UserSettings.vue'
import HomePage from '@/HomePage.vue'
import SideInfoPanel from '@/components/SideInfoPanel.vue'
import type { Contact } from '@/models/contact-model';
import { storageService } from '@/services/storage.service';
import { useContactStore } from '@/stores/ContactStore';
import ChatPanel from '@/components/chat/ChatPanel.vue'
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
const sidebarWidth = computed(() => sidebarCollapsed.value ? '64px' : '240px')
// ContactList panel stays normal width, but UserSearch and ContactRequests get wider
const contactListWidth = '320px' // w-80 = 20rem = 320px
const widerPanelWidth = '480px' // Wider panels for UserSearch and ContactRequests

// Get panel width based on which panel is active
const activePanelWidth = computed(() => {
  if (showContacts.value) return contactListWidth
  if (showRequests.value) return widerPanelWidth
  if (showSearch.value) return widerPanelWidth
  return '0px'
})

// Calculate chat window position and width as computed properties
const chatLeftPosition = computed(() => {
  if (showContacts.value || showRequests.value || showSearch.value) {
    return `calc(${sidebarWidth.value} + ${activePanelWidth.value})`
  }
  return sidebarWidth.value
})

const chatWidth = computed(() => {
  return `calc(100vw - ${chatLeftPosition.value})`
})

// Determine which panel type is active for the info panel
const activePanelType = computed(() => {
  if (showSearch.value) return 'search'
  if (showRequests.value) return 'requests'
  return 'none'
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
    sidebarCollapsed.value ? '64px' : '240px'
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

function closeAllPanels() {
  // Close all panels and chat
  showContacts.value = false
  showRequests.value = false
  showSearch.value = false
  showUserSettings.value = false
  closeChat()
}
</script>

<template>
  <div class="flex">
    <!-- Left Sidebar Navigation -->
    <SidebarNavigation :collapsed="sidebarCollapsed" @toggle-collapsed="toggleSidebar" @toggle-contacts="toggleContacts"
      @toggle-requests="toggleRequests" @toggle-search="toggleSearch" @toggle-settings="toggleUserSettings" 
      @home-clicked="closeAllPanels" />

    <!-- Contacts List Panel -->
    <div v-if="showContacts"
      class="panel-container fixed z-10 top-0 bottom-0 overflow-y-auto border-r border-border bg-card transition-all duration-300 ease-in-out"
      :style="{ left: sidebarWidth }" :class="{ 'w-80': true }">
      <ContactList :visible="showContacts" @select="selectContact" />
    </div>

    <!-- Contact Requests Panel - Wider than contact list -->
    <div v-if="showRequests"
      class="panel-container fixed z-10 top-0 bottom-0 overflow-y-auto border-r border-border bg-gradient-to-b from-slate-50 to-card dark:from-slate-900/50 dark:to-card transition-all duration-300 ease-in-out shadow-sm"
      :style="{ left: sidebarWidth, width: widerPanelWidth }">
      <ContactRequests :visible="showRequests" />
    </div>

    <!-- User Search Panel - Wider than contact list -->
    <div v-if="showSearch"
      class="panel-container fixed z-10 top-0 bottom-0 overflow-y-auto border-r border-border bg-gradient-to-b from-slate-50 to-card dark:from-slate-900/50 dark:to-card transition-all duration-300 ease-in-out shadow-sm"
      :style="{ left: sidebarWidth, width: widerPanelWidth }">
      <div class="p-6 border-b border-border/50">
        <h2 class="text-xl font-bold mb-1 bg-gradient-to-r from-violet-700 to-indigo-600 dark:from-violet-500 dark:to-indigo-400 bg-clip-text text-transparent">
          Find Contacts
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Search for users to add as contacts
        </p>
      </div>
      <UserSearch />
    </div>

    <!-- User Settings Panel -->
    <div v-if="showUserSettings"
      class="panel-container fixed z-10 top-0 bottom-0 overflow-hidden bg-gradient-to-b from-slate-50 to-card dark:from-slate-900/50 dark:to-card transition-all duration-300 ease-in-out shadow-sm"
      :style="{ left: sidebarWidth, right: '0' }">
      <!-- Back button header -->
      <div class="p-4 border-b border-border/50 flex items-center sticky top-0 bg-opacity-90 backdrop-blur-sm z-50">
        <button @click="toggleUserSettings" 
          class="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-3"
          aria-label="Return to application">
          <ArrowLeft class="h-5 w-5 text-slate-700 dark:text-slate-300" />
        </button>
        <h1 class="text-lg font-medium bg-gradient-to-r from-violet-700 to-indigo-600 dark:from-violet-500 dark:to-indigo-400 bg-clip-text text-transparent">
          User Settings
        </h1>
      </div>

      <div class="h-[calc(100vh-64px)] overflow-y-auto">
        <UserSettings />
      </div>
    </div>

    <!-- Chat Panel -->
    <ChatPanel 
      v-if="selectedContact" 
      :contact="selectedContact" 
      :visible="showChat" 
      :left-position="chatLeftPosition"
      :width="chatWidth" 
      @close="closeChat" 
      class="transition-all duration-300" 
    />
    
    <!-- Home Page - Display when no other panels are active -->
    <div 
      v-if="!showContacts && !showRequests && !showSearch && !showUserSettings && !showChat"
      class="fixed top-0 bottom-0 right-0 transition-all duration-300"
      :style="{ left: sidebarWidth }">
      <HomePage />
    </div>

    <!-- Info Panel - Display helpful information when search or requests are open -->
    <div 
      v-if="(showSearch || showRequests) && !showChat"
      class="fixed top-0 bottom-0 right-0 transition-all duration-300"
      :style="{ left: `calc(${sidebarWidth} + ${activePanelWidth})` }">
      <SideInfoPanel :active-panel-type="activePanelType" />
    </div>
  </div>
</template>

<style>
:root {
  --sidebar-width: 240px;
}

[data-collapsed=true] {
  --sidebar-width: 64px;
}

/* Add animation for panel transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Panel hover effects */
.panel-container {
  transition: all 0.3s ease;
  border-radius: 0;
}

.panel-container:hover {
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.1);
}

/* Modern scrollbars for all panels */
*::-webkit-scrollbar {
  width: 8px;
}

*::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.03);
}

*::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 20px;
}

*::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}
</style>

<style>
:root {
  --sidebar-width: 240px;
}

[data-collapsed=true] {
  --sidebar-width: 64px;
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
