<script setup lang="ts">
import AppSidebar from '@/components/ui/sidebar/AppSidebar.vue'
import { SidebarProvider } from '@/components/ui/sidebar'
</script>

<template>
  <div class="flex min-h-screen">
    <SidebarProvider>
      <AppSidebar />
      <main class="flex-1 ml-[var(--sidebar-width)]">
      </main>
    </SidebarProvider>
  </div>
</template>