<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import { Home, Inbox, Search, Settings, ChevronRight, ChevronLeft, UserPlus } from "lucide-vue-next"

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-collapsed', 'toggle-contacts', 'toggle-requests', 'toggle-search'])

const items = [
  { title: "Home", url: "#", icon: Home },
  { title: "Contacts", url: "#", icon: Inbox, action: () => emit('toggle-contacts') },
  { title: "Requests", url: "#", icon: UserPlus, action: () => emit('toggle-requests') },
  { title: "Search", url: "#", icon: Search, action: () => emit('toggle-search') },
  { title: "Settings", url: "#", icon: Settings },
];

function toggleSidebar() {
  emit('toggle-collapsed')
}
</script>

<template>
  <aside :class="[
    'fixed inset-y-0 left-0 z-20 transition-all duration-300 ease-in-out border-r border-border bg-sidebar',
    collapsed ? 'w-12' : 'w-[var(--sidebar-width)]'
  ]">
    <!-- Toggle Sidebar Button -->
    <button @click="toggleSidebar"
      class="absolute -right-3 top-5 bg-primary text-primary-foreground rounded-full p-1 shadow-md z-50"
      id="sidebar-toggle"
      :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
      <ChevronLeft v-if="!collapsed" class="h-4 w-4" />
      <ChevronRight v-else class="h-4 w-4" />
    </button>

    <div class="flex h-full flex-col">
      <div class="p-2">
        <div class="relative w-full min-w-0 flex-col">
          <!-- Sidebar Header -->
          <div :class="[
            'flex h-8 shrink-0 items-center px-2 text-xs font-medium text-sidebar-foreground/70',
            collapsed ? 'opacity-0' : 'opacity-100'
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
                  collapsed ? 'opacity-0 w-0' : 'opacity-100'
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
</template>