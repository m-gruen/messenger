<script setup lang="ts">
import { ref, onMounted } from 'vue'
interface User {
  uid: number;
  username: string;
  created_at: string;
}

import { Calendar, Home, Inbox, Search, Settings, ChevronRight, ChevronLeft } from "lucide-vue-next"
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
            class="p-2 rounded-md hover:bg-accent flex items-center cursor-pointer">
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