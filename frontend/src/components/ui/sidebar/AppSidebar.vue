<script setup lang="ts">
import { ref } from 'vue'
interface User {
  uid: number;
  username: string;
  contactUserId: number;
  userId: number;
  createdAt: string;
  status: string;
}

interface Message {
  mid: number;
  sender_uid: number;
  receiver_uid: number;
  content: string;
  timestamp: string;
}

import { 
  Calendar, Home, Inbox, Search, Settings, ChevronRight, 
  ChevronLeft, X, FileText, Share
} from "lucide-vue-next"


const currentUserId = 1;

const items = [
  { title: "Home", url: "#", icon: Home },
  { title: "Contacts", url: "#", icon: Inbox, action: toggleContacts },
  { title: "Calendar", url: "#", icon: Calendar },
  { title: "Search", url: "#", icon: Search },
  { title: "Settings", url: "#", icon: Settings },
];

const contacts = ref<User[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const showContacts = ref(false)
const sidebarCollapsed = ref(false)
const selectedContact = ref<User | null>(null)


const messages = ref<Message[]>([])
const isLoadingMessages = ref(false)
const messagesError = ref<string | null>(null)

async function fetchContacts(userId: number) {
  isLoading.value = true
  error.value = null
  
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    const response = await fetch(`${backendUrl}/contact/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`
      }
    })
    
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    
    contacts.value = await response.json()

    
    contacts.value = contacts.value.sort((a: User, b: User) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Error fetching contacts:', err)
  } finally {
    isLoading.value = false
  }
}


async function fetchMessages(userId: number, contactId: number) {
  isLoadingMessages.value = true
  messagesError.value = null
  
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    const response = await fetch(`${backendUrl}/message?sender_uid=${userId}&receiver_uid=${contactId}`)
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    
    const data: Message[] = await response.json();
    
    messages.value = data.sort((a: Message, b: Message) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  } catch (err) {
    messagesError.value = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Error fetching messages:', err)
  } finally {
    isLoadingMessages.value = false
  }
}

function toggleContacts() {
  showContacts.value = !showContacts.value
  if (showContacts.value) {
    fetchContacts(currentUserId)
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  document.documentElement.style.setProperty(
    '--sidebar-width', 
    sidebarCollapsed.value ? '48px' : '240px'
  )
}

function selectContact(contact: User) {
  selectedContact.value = contact
  messages.value = [] 
  if (contact && contact.userId) {
    fetchMessages(currentUserId, contact.contactUserId)
  } else {
    
    console.error('Invalid contact selected, missing userId')
    messagesError.value = 'Cannot load messages: Invalid contact'
  }
}


function formatDate(dateString: string) {
  
  const date = new Date(dateString)
  return date.toLocaleString()
}
</script>

<template>
  <div class="flex">
    <!-- Sidebar code remains the same -->
    <aside 
      :class="[
        'fixed inset-y-0 left-0 z-20 transition-all duration-300 ease-in-out border-r border-border bg-sidebar', 
        sidebarCollapsed ? 'w-12' : 'w-[var(--sidebar-width)]'
      ]"
    >
      <!-- Sidebar content remains the same -->
      <button 
        @click="toggleSidebar"
        class="absolute -right-3 top-5 bg-primary text-primary-foreground rounded-full p-1 shadow-md z-30"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <ChevronLeft v-if="!sidebarCollapsed" class="h-4 w-4" />
        <ChevronRight v-else class="h-4 w-4" />
      </button>

      <div class="flex h-full flex-col">
        <div class="p-2">
          <div class="relative w-full min-w-0 flex-col">
            <!-- Group label (hidden when collapsed) -->
            <div 
              :class="[
                'flex h-8 shrink-0 items-center px-2 text-xs font-medium text-sidebar-foreground/70',
                sidebarCollapsed ? 'opacity-0' : 'opacity-100'
              ]"
              :style="{ transition: 'opacity 0.3s ease-in-out' }"
            >
              Application
            </div>

            <ul class="flex w-full min-w-0 flex-col gap-1">
              <li v-for="item in items" :key="item.title" class="relative">
                <a 
                  :href="item.url" 
                  @click.prevent="item.action ? item.action() : null"
                  :title="item.title"
                  class="flex items-center gap-2 overflow-hidden rounded-md p-2 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <component :is="item.icon" class="flex-shrink-0 h-5 w-5" />
                  <span 
                    :class="[
                      'transition-opacity duration-300 truncate', 
                      sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
                    ]"
                  >
                    {{ item.title }}
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </aside>

    <!-- Contacts panel code remains the same -->
    <div 
      v-if="showContacts" 
      class="fixed z-10 top-0 bottom-0 overflow-y-auto border-r border-border p-4 bg-card transition-all duration-300 ease-in-out"
      :style="{ left: sidebarCollapsed ? '48px' : 'var(--sidebar-width)' }"
      :class="{ 'w-64': true }"
    >
      <h2 class="text-xl font-bold mb-3">Contacts</h2>

      <div v-if="isLoading" class="flex items-center justify-center p-4">
        <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
        <span class="ml-2">Loading contacts...</span>
      </div>

      <div v-else-if="error" class="bg-destructive/10 text-destructive p-4 rounded-md">
        {{ error }}
      </div>

      <div v-else-if="contacts.length === 0" class="text-muted-foreground p-4">
        No contacts found.
      </div>

      <ul v-else class="space-y-2">
        <li v-for="contact in contacts" :key="contact.uid" 
            class="p-2 rounded-md hover:bg-accent flex items-center cursor-pointer"
            @click="selectContact(contact)"
        >
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            {{ contact.username.charAt(0).toUpperCase() }}
          </div>
          <div class="ml-3">
            <div class="font-medium">{{ contact.username }}</div>
            <div class="text-xs text-muted-foreground">
              Joined {{ new Date(contact.createdAt).toLocaleDateString() }}
            </div>
          </div>
        </li>
      </ul>
    </div>
    
    <!-- Updated Contact Card with messages -->
    <div 
      v-if="selectedContact" 
      class="fixed z-10 top-0 bottom-0 overflow-y-auto border-r border-border p-4 bg-card transition-all duration-300 ease-in-out"
      :style="{ left: showContacts ? (sidebarCollapsed ? '368px' : '560px') : (sidebarCollapsed ? '48px' : 'var(--sidebar-width)') }"
      :class="{ 'w-96': true }"
    >
      <!-- Contact Card Header -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">Contact Details</h2>
        <button 
          @click="selectedContact = null" 
          class="rounded-full p-1 hover:bg-accent"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
      
      <!-- Contact Card Content -->
      <div class="space-y-4">
        <!-- Avatar and Name -->
        <div class="flex items-center">
          <div class="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl">
            {{ selectedContact.username.charAt(0).toUpperCase() }}
          </div>
          <div class="ml-4">
            <div class="text-2xl font-bold">{{ selectedContact.username }}</div>
            <div class="text-sm text-muted-foreground">
              Joined {{ new Date(selectedContact.createdAt).toLocaleDateString() }}
            </div>
          </div>
        </div>
        
        <!-- Contact Actions -->
        <div class="flex gap-2">
          <button class="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90">
            <FileText class="h-4 w-4" />
            <span>Message</span>
          </button>
          <button class="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-secondary-foreground hover:bg-secondary/90">
            <Share class="h-4 w-4" />
            <span>Share</span>
          </button>
        </div>
        
        <!-- Contact Details -->
        <div class="space-y-2 border-t pt-4">
          <div class="grid grid-cols-3 gap-4">
            <div class="text-sm font-medium">User ID</div>
            <div class="col-span-2 text-sm">{{ selectedContact.contactUserId   }}</div>
            </div>
            <div class="grid grid-cols-3 gap-4">
            <div class="text-sm font-medium">Status</div>
            <div class="col-span-2 text-sm">
              <span 
              class="inline-flex h-2 w-2 rounded-full mr-2"
              :class="{
                'bg-green-500': selectedContact.status === 'accepted',
                'bg-yellow-500': selectedContact.status === 'pending',
                'bg-red-500': selectedContact.status === 'blocked'
              }"
              ></span>
              {{ selectedContact.status[0].toUpperCase() + selectedContact.status.slice(1) }}
            </div>
            </div>
        </div>
        
        <!-- Conversation History - Updated section -->
        <div class="mt-6 space-y-4">
          <h3 class="text-lg font-semibold">Recent Messages</h3>
          
          <!-- Loading state -->
          <div v-if="isLoadingMessages" class="flex items-center justify-center py-8">
            <div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            <span class="ml-2">Loading messages...</span>
          </div>
          
          <!-- Error state -->
          <div v-else-if="messagesError" class="bg-destructive/10 text-destructive p-4 rounded-md">
            {{ messagesError }}
          </div>
          
          <!-- Empty state -->
          <div v-else-if="messages.length === 0" class="bg-muted p-4 rounded-md text-center">
            <p>No messages yet</p>
            <button class="mt-2 text-primary text-sm">Send first message</button>
          </div>
          
          <!-- Messages list -->
          <div v-else class="space-y-3">
            <div 
              v-for="message in messages.slice(0, 5)" 
              :key="message.mid" 
              class="rounded-lg p-3 text-sm"
              :class="{
                'bg-primary text-primary-foreground ml-8': message.sender_uid === currentUserId,
                'bg-muted mr-8': message.sender_uid !== currentUserId
              }"
            >
              <div class="flex justify-between mb-1">
                <span class="font-medium">
                  {{ message.sender_uid === currentUserId ? 'You' : selectedContact.username }}
                </span>
                <span class="text-xs opacity-80">
                  {{ formatDate(message.timestamp)}}
                </span>
              </div>
              <p>{{ message.content }}</p>
            </div>
            
            <div v-if="messages.length > 5" class="text-center text-sm">
              <button class="text-primary hover:underline">
                View all messages
              </button>
            </div>
          </div>
        </div>
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