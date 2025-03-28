<script setup lang="ts">
import { ref, onMounted } from 'vue'
interface User {
  uid: number;
  username: string;
  created_at: string;
}

import { Calendar, Home, Inbox, Search, Settings, ChevronRight, ChevronLeft, X, Message } from "lucide-vue-next"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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

async function fetchContacts(userId: number) {
  isLoading.value = true
  error.value = null
  
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    const response = await fetch(`${backendUrl}/contact/${userId}`)
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }
    
    contacts.value = await response.json()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    console.error('Error fetching contacts:', err)
  } finally {
    isLoading.value = false
  }
}

function toggleContacts() {
  showContacts.value = !showContacts.value
  if (showContacts.value) {
    fetchContacts(1)
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
}
</script>

<template>
  <div class="flex">

    <aside 
      :class="[
        'fixed inset-y-0 left-0 z-20 transition-all duration-300 ease-in-out border-r border-border bg-sidebar', 
        sidebarCollapsed ? 'w-12' : 'w-[var(--sidebar-width)]'
      ]"
    >

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
              Joined {{ new Date(contact.created_at).toLocaleDateString() }}
            </div>
          </div>
        </li>
      </ul>
    </div>
    
    <!-- Contact Card (appears when a contact is selected) -->
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
              Joined {{ new Date(selectedContact.created_at).toLocaleDateString() }}
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
            <div class="col-span-2 text-sm">{{ selectedContact.uid }}</div>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div class="text-sm font-medium">Status</div>
            <div class="col-span-2 text-sm">
              <span class="inline-flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              Online
            </div>
          </div>
        </div>
        
        <!-- Conversation History -->
        <div class="mt-6 space-y-4">
          <h3 class="text-lg font-semibold">Recent Messages</h3>
          <div class="space-y-2">
            <div class="rounded-lg bg-accent p-3">
              <p class="text-sm">This is where you would show recent messages...</p>
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