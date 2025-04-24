<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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

// Get user ID and token from storage service
const user = storageService.getUser();
const currentUserId = computed(() => user?.uid || 0);
const token = computed(() => storageService.getToken() || '');

// Contact store
const contactStore = useContactStore();

const items = [
  { title: "Home", url: "#", icon: Home },
  { title: "Contacts", url: "#", icon: Inbox, action: toggleContacts },
  { title: "Requests", url: "#", icon: UserPlus, action: toggleRequests },
  { title: "Search", url: "#", icon: Search, action: toggleSearch },
  { title: "Settings", url: "#", icon: Settings, action: toogleUserSettings },
];

const showContacts = ref(false)
const showRequests = ref(false)
const showSearch = ref(false)
const showUserSettings = ref(false);
const sidebarCollapsed = ref(false)
const selectedContact = ref<Contact | null>(null)
const showChat = ref(false)
const newMessage = ref('')

const messages = ref<IMessage[]>([])
const isLoadingMessages = ref(false)
const messagesError = ref<string | null>(null)

// Computed properties for positional styling
const sidebarWidth = computed(() => sidebarCollapsed.value ? '48px' : '240px');
const panelWidth = '320px'; // Fixed width for all panels (w-80 = 20rem = 320px)

// Calculate chat window position and width as computed properties
const chatLeftPosition = computed(() => {
  if (showContacts.value) {
    return `calc(${sidebarWidth.value} + ${panelWidth})`;
  } else if (showRequests.value) {
    return `calc(${sidebarWidth.value} + ${panelWidth})`;
  } else if (showSearch.value) {
    return `calc(${sidebarWidth.value} + ${panelWidth})`;
  }
  return sidebarWidth.value;
});

const chatWidth = computed(() => {
  return `calc(100vw - ${chatLeftPosition.value})`;
});

onMounted(async () => {
  if (currentUserId.value) {
    await contactStore.fetchAllContacts();
  }
});

// Re-fetch contacts when needed sections are toggled visible
watch(showContacts, async (isVisible) => {
  if (isVisible && currentUserId.value) {
    await contactStore.fetchAllContacts();
  }
});

async function fetchMessages(userId: number, contactId: number) {
  messagesError.value = null
  isLoadingMessages.value = true;
  
  try {
    messages.value = await apiService.getMessages(userId, contactId, token.value);
    
    messages.value = messages.value.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
    
    setTimeout(() => {
      const messageContainer = document.querySelector('.flex.flex-col-reverse.space-y-reverse.space-y-4');
      if (messageContainer) {
        messageContainer.scrollIntoView({
          behavior: 'instant',
          block: 'end',
          inline: 'nearest'
        });
      }
    }, 0);
  } catch (err) {
    messagesError.value = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Error fetching messages:', err)
  } finally {
    isLoadingMessages.value = false
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedContact.value) return;
  
  try {
    const sentMessage = await apiService.sendMessage(
      currentUserId.value,
      selectedContact.value.contactUserId,
      newMessage.value,
      token.value
    );
    
    messages.value.push(sentMessage);
    fetchMessages(currentUserId.value, selectedContact.value.contactUserId);
    newMessage.value = '';
  } catch (err) {
    messagesError.value = err instanceof Error ? err.message : 'Failed to send message'
    console.error('Error sending message:', err)
  }
}

function toogleUserSettings() {
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
  }
  showChat.value = false;
}

function toggleRequests() {
  showRequests.value = !showRequests.value
  if (showRequests.value) {
    // Close other panels if requests is opened
    showContacts.value = false
    showSearch.value = false
  }
  showChat.value = false;
}

function toggleSearch() {
  showSearch.value = !showSearch.value
  // Close other panels if search is opened
  if (showSearch.value) {
    showContacts.value = false
    showRequests.value = false
  }
  showChat.value = false;
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
  showChat.value = true;

  if (contact && contact.userId) {
    fetchMessages(currentUserId.value, contact.contactUserId)
  } else {
    console.error('Invalid contact selected, missing userId')
    messagesError.value = 'Cannot load messages: Invalid contact'
  }
}

function formatDate(dateString: string | Date) {
  const date = dateString instanceof Date ? dateString : new Date(dateString)
  return date.toLocaleString()
}

function getStatusColorClass(status: ContactStatus | string): string {
  switch(status) {
    case ContactStatus.ACCEPTED:
      return 'bg-green-500';
    case ContactStatus.INCOMING_REQUEST:
    case ContactStatus.OUTGOING_REQUEST:
      return 'bg-yellow-500';
    case ContactStatus.REJECTED:
    case ContactStatus.BLOCKED:
      return 'bg-red-500';
    case ContactStatus.DELETED:
      return 'bg-gray-500';
    default:
      return 'bg-blue-500';
  }
}

function formatStatusText(status: ContactStatus | string): string {
  let statusString: string;
  
  if (status === ContactStatus.ACCEPTED) statusString = 'accepted';
  else if (status === ContactStatus.INCOMING_REQUEST) statusString = 'incoming_request';
  else if (status === ContactStatus.OUTGOING_REQUEST) statusString = 'outgoing_request';
  else if (status === ContactStatus.REJECTED) statusString = 'rejected';
  else if (status === ContactStatus.BLOCKED) statusString = 'blocked';
  else if (status === ContactStatus.DELETED) statusString = 'deleted';
  else statusString = status as string;
  
  return statusString
    .split('_')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
</script>

<template>
  <div class="flex">
    <!-- Left Sidebar Navigation -->
    <aside :class="[
      'fixed inset-y-0 left-0 z-20 transition-all duration-300 ease-in-out border-r border-border bg-sidebar',
      sidebarCollapsed ? 'w-12' : 'w-[var(--sidebar-width)]'
    ]">
      <!-- Toggle Sidebar Button -->
      <button @click="toggleSidebar"
        class="absolute -right-3 top-5 bg-primary text-primary-foreground rounded-full p-1 shadow-md z-50"
        id="sidebar-toggle"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
        <ChevronLeft v-if="!sidebarCollapsed" class="h-4 w-4" />
        <ChevronRight v-else class="h-4 w-4" />
      </button>

      <div class="flex h-full flex-col">
        <div class="p-2">
          <div class="relative w-full min-w-0 flex-col">
            <!-- Sidebar Header -->
            <div :class="[
              'flex h-8 shrink-0 items-center px-2 text-xs font-medium text-sidebar-foreground/70',
              sidebarCollapsed ? 'opacity-0' : 'opacity-100'
            ]" :style="{ transition: 'opacity 0.3s ease-in-out' }">
              Application
            </div>

            <!-- Navigation Items -->
            <ul class="flex w-full min-w-0 flex-col gap-1">
              <li v-for="item in items" :key="item.title" class="relative">
                <a :href="item.url" @click.prevent="item.action ? item.action() : null" :title="item.title"
                  class="flex items-center gap-2 overflow-hidden rounded-md p-2 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <component :is="item.icon" class="flex-shrink-0 h-5 w-5" />
                  <span :class="[
                    'transition-opacity duration-300 truncate',
                    sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
                  ]">
                    {{ item.title }}
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </aside>

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
      class="fixed z-10 top-0 bottom-0 overflow-y-auto border-r border-border bg-card transition-all duration-300 ease-in-out"
      :style="{ left: sidebarWidth }" :class="{ 'w-80': true }">
      <div class="p-4 border-b">
        <h2 class="text-xl font-bold mb-1">User Settings</h2>
        <p class="text-sm text-muted-foreground">Manage your account settings</p>
      </div>
      <UserSettings />
    </div>

    <!-- Chat Interface (WhatsApp-like) -->
    <div v-if="selectedContact && showChat"
      class="fixed z-10 top-0 bottom-0 border-r border-border bg-background transition-all duration-300 ease-in-out flex flex-col"
      :style="{
        left: chatLeftPosition,
        width: chatWidth
      }">
      <!-- Chat Header -->
      <div class="flex items-center p-4 border-b bg-card">
        <button @click="showChat = false" class="mr-2 rounded-full p-1.5 hover:bg-accent">
          <ArrowLeft class="h-5 w-5" />
        </button>

        <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          {{ selectedContact.username.charAt(0).toUpperCase() }}
        </div>

        <div class="ml-3">
          <div class="font-medium">{{ selectedContact.username }}</div>
          <div class="text-xs text-muted-foreground">
            <span class="inline-flex h-2 w-2 rounded-full mr-1" :class="getStatusColorClass(selectedContact.status)"></span>
            {{ formatStatusText(selectedContact.status) }}
          </div>
        </div>
      </div>

      <!-- Messages Container -->
      <div class="flex-1 overflow-y-auto p-4 bg-background/95"
        style="background-image: url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E');">
        <div v-if="isLoadingMessages" class="flex items-center justify-center h-full">
          <div class="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
          <span class="ml-2">Loading messages...</span>
        </div>

        <div v-else-if="messagesError" class="bg-destructive/10 text-destructive p-4 rounded-md m-auto">
          {{ messagesError }}
        </div>

        <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
          <div class="bg-card p-6 rounded-lg shadow-lg">
            <MessageSquare class="h-12 w-12 mx-auto text-muted-foreground" />
            <p class="mt-4 text-muted-foreground">No messages yet with {{ selectedContact.username }}</p>
            <p class="mt-2 text-sm text-muted-foreground">Send a message to start the conversation</p>
          </div>
        </div>

        <div v-else class="flex flex-col-reverse space-y-reverse space-y-4">
          <div v-for="message in messages" :key="message.mid" :class="{
            'flex justify-end': message.sender_uid === currentUserId,
            'flex justify-start': message.sender_uid !== currentUserId
          }">
            <div class="max-w-[70%] rounded-lg p-3 shadow-sm" :class="{
              'bg-primary text-primary-foreground rounded-br-none': message.sender_uid === currentUserId,
              'bg-card rounded-bl-none': message.sender_uid !== currentUserId
            }">
              <p class="mb-1">{{ message.content }}</p>
              <div class="flex justify-end">
                <span class="text-xs opacity-70">
                  {{ formatDate(message.timestamp) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="p-4 border-t bg-card">
        <form @submit.prevent="sendMessage" class="flex items-center gap-2">
          <input v-model="newMessage" type="text" placeholder="Type a message..."
            class="flex-1 rounded-full border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" autofocus />
          <button type="submit" class="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90"
            :disabled="!newMessage.trim()">
            <Send class="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
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
