<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { storageService } from '@/services/storage.service';
import UserSettingsPage from '@/components/settings/UserSettingsPage.vue';
import PrivacySettingsPage from '@/components/settings/PrivacySettingsPage.vue';
import MessageStoragePage from '@/components/settings/MessageStoragePage.vue';

const router = useRouter();
const activeSection = ref('user'); // 'user', 'privacy', 'storage'

// Function to handle navigation between sections
function navigateTo(section: string) {
  activeSection.value = section;
}

function logout() {
  storageService.clearAuth();
  router.push('/login');
}
</script>

<template>
  <div class="w-full h-full flex">
    <!-- Settings sidebar -->
    <div class="w-64 bg-card border-r border-border flex flex-col h-full">
      <!-- Navigation sections -->
      <div class="overflow-y-auto flex-grow p-2">
        <!-- User Settings -->
        <button 
          @click="navigateTo('user')" 
          class="w-full text-left p-2 px-4 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors mb-1"
          :class="{ 'bg-accent text-accent-foreground': activeSection === 'user' }"
        >
          <div class="font-medium">My Account</div>
        </button>

        <!-- Privacy Settings -->
        <button 
          @click="navigateTo('privacy')" 
          class="w-full text-left p-2 px-4 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors mb-1"
          :class="{ 'bg-accent text-accent-foreground': activeSection === 'privacy' }"
        >
          <div class="font-medium">Privacy Settings</div>
        </button>

        <!-- Message Storage Settings -->
        <button 
          @click="navigateTo('storage')" 
          class="w-full text-left p-2 px-4 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          :class="{ 'bg-accent text-accent-foreground': activeSection === 'storage' }"
        >
          <div class="font-medium">Message Storage</div>
        </button>
      </div>

      <!-- Logout button at bottom of sidebar -->
      <div class="p-4 border-t border-border mt-auto">
        <Button variant="destructive" @click="logout" class="w-full">
          Log Out
        </Button>
      </div>
    </div>

    <!-- Main settings content area -->
    <div class="flex-1 overflow-y-auto p-6 bg-background">
      <!-- Dynamic component based on selected section -->
      <UserSettingsPage v-if="activeSection === 'user'" />
      <PrivacySettingsPage v-else-if="activeSection === 'privacy'" />
      <MessageStoragePage v-else-if="activeSection === 'storage'" />
    </div>
  </div>
</template>

<style scoped>

/* Input field styling */
input,
select {
  border-width: 2px !important;
}

.dark input,
.dark select {
  color: white !important;
  background-color: #2D3748 !important;
}

/* Remove extra margins to prevent unexpected spacing */
.max-w-3xl {
  margin-top: 0;
}
</style>

