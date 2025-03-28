<script setup lang="ts">
import { ref, onMounted } from 'vue'
interface User {
  uid: number;
  username: string;
  created_at: string;

}
import { Calendar, Home, Inbox, Search, Settings } from "lucide-vue-next"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
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

// Function to toggle contact visibility and fetch contacts
function toggleContacts() {
  showContacts.value = !showContacts.value
  if (showContacts.value) {
    fetchContacts(1)
  }
}

</script>

<template>
  <div class="flex">

    <aside class="fixed inset-y-0 left-0 z-20 w-[var(--sidebar-width)] border-r border-border bg-sidebar">
      <div class="flex h-full flex-col">
        <div class="p-2">
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem v-for="item in items" :key="item.title">
                  <SidebarMenuButton asChild>
                    <a :href="item.url" @click.prevent="item.action ? item.action() : null">
                      <component :is="item.icon" />
                      <span>{{item.title}}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </div>
    </aside>

    <div v-if="showContacts" class="w-64 p-4">
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

      <ul v-else class="space">
        <li v-for="contact in contacts" :key="contact.uid" 
            class="p-2 rounded-md hover:bg-accent flex items-center">
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
</style>