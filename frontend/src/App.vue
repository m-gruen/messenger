<script setup lang="ts">
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/ui/sidebar/AppSidebar.vue";
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
  </SidebarProvider>
</template>