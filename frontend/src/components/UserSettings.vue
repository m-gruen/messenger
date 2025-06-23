<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/AuthStore';
import UserSettingsTab from '@/components/settings/UserSettingsTab.vue';
import PrivacySettingsTab from '@/components/settings/PrivacySettingsTab.vue';
import KeyManagementTab from '@/components/settings/KeyManagementTab.vue';
import MessageStorageTab from '@/components/settings/MessageStorageTab.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { User, Shield, Database, Key, LogOut } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const activeSection = ref('user'); // 'user', 'privacy', 'keys', 'messages'
const showLogoutConfirm = ref(false);

// Function to handle navigation between sections
function navigateTo(section: string) {
  activeSection.value = section;
}

async function logout() {
  try {
    await authStore.logout();
    router.push('/login');
  } catch (error) {
    console.error('Error during logout:', error);
    router.push('/login');
  }
}

function confirmLogout() {
  showLogoutConfirm.value = true;
}
</script>

<template>
  <div class="w-full h-full flex">
    <!-- Settings sidebar -->
    <div class="w-72 bg-gradient-to-b from-slate-50 to-card dark:from-slate-900/50 dark:to-card border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      <!-- Nexus Logo Header -->
      <div class="p-6 pb-2 border-b border-slate-200 dark:border-slate-800/70">
        <div class="flex items-center justify-center mb-4">
          <div class="nexus-logo-container">
            <img src="/nexus_logo.png" alt="Nexus" class="nexus-settings-logo" />
            <div class="logo-glow"></div>
          </div>
        </div>
        <h2 class="text-xl font-bold bg-gradient-to-r from-violet-700 to-indigo-600 dark:from-violet-500 dark:to-indigo-400 bg-clip-text text-transparent text-center mb-1">
          Nexus Settings
        </h2>
        <p class="text-sm text-slate-600 dark:text-slate-400 mt-1 text-center">
          Manage your account and preferences
        </p>
      </div>

      <!-- Navigation sections -->
      <div class="overflow-y-auto flex-grow px-3 py-2">
        <!-- User Settings -->
        <button 
          @click="navigateTo('user')" 
          class="w-full text-left p-3 rounded-lg transition-all duration-200 mb-1.5 flex items-center gap-3"
          :class="activeSection === 'user' 
            ? 'bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-700 dark:text-indigo-300 font-medium shadow-sm' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
        >
          <div 
            class="p-2 rounded-lg"
            :class="activeSection === 'user' 
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
          >
            <User class="h-5 w-5" />
          </div>
          <div class="font-medium">My Account</div>
        </button>

        <!-- Privacy Settings -->
        <button 
          @click="navigateTo('privacy')" 
          class="w-full text-left p-3 rounded-lg transition-all duration-200 mb-1.5 flex items-center gap-3"
          :class="activeSection === 'privacy' 
            ? 'bg-gradient-to-r from-purple-500/10 to-violet-500/10 text-purple-700 dark:text-purple-300 font-medium shadow-sm' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
        >
          <div 
            class="p-2 rounded-lg"
            :class="activeSection === 'privacy' 
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
          >
            <Shield class="h-5 w-5" />
          </div>
          <div class="font-medium">Privacy Settings</div>
        </button>

        <!-- Message Storage -->
        <button 
          @click="navigateTo('messages')" 
          class="w-full text-left p-3 rounded-lg transition-all duration-200 mb-1.5 flex items-center gap-3"
          :class="activeSection === 'messages' 
            ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-700 dark:text-blue-300 font-medium shadow-sm' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
        >
          <div 
            class="p-2 rounded-lg"
            :class="activeSection === 'messages' 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
          >
            <Database class="h-5 w-5" />
          </div>
          <div class="font-medium">Message Storage</div>
        </button>

        <!-- Key Management -->
        <button 
          @click="navigateTo('keys')" 
          class="w-full text-left p-3 rounded-lg transition-all duration-200 mb-1.5 flex items-center gap-3"
          :class="activeSection === 'keys' 
            ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-700 dark:text-amber-300 font-medium shadow-sm' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
        >
          <div 
            class="p-2 rounded-lg"
            :class="activeSection === 'keys' 
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
          >
            <Key class="h-5 w-5" />
          </div>
          <div class="font-medium">Key Management</div>
        </button>
      </div>
      
      <!-- Logout Button -->
      <div class="p-4 pt-3 mt-auto border-t border-slate-200 dark:border-slate-800/70">
        <Button 
          variant="destructive" 
          @click="confirmLogout" 
          class="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-md flex items-center justify-center gap-2"
        >
          <LogOut class="h-4 w-4" />
          <span>Log Out</span>
        </Button>
      </div>
    </div>
    
    <!-- Main content area with animated transitions -->
    <div class="flex-1 overflow-auto p-6 relative">
      <!-- Background decoration -->
      <div class="absolute top-6 right-6 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 rounded-full blur-3xl -z-10"></div>
      <div class="absolute bottom-6 left-6 w-64 h-64 bg-gradient-to-tr from-blue-500/5 to-cyan-500/5 rounded-full blur-3xl -z-10"></div>
      
      <!-- Render the appropriate component based on activeSection -->
      <div class="animate-fade-in">
        <UserSettingsTab v-if="activeSection === 'user'" />
      </div>
      <div class="animate-fade-in">
        <PrivacySettingsTab v-if="activeSection === 'privacy'" />
      </div>
      <div class="animate-fade-in">
        <MessageStorageTab v-if="activeSection === 'messages'" />
      </div>
      <div class="animate-fade-in">
        <KeyManagementTab v-if="activeSection === 'keys'" />
      </div>
    </div>
  </div>
  
  <!-- Confirm Logout Dialog -->
  <ConfirmDialog
    v-model:show="showLogoutConfirm"
    title="Confirm Logout"
    message="Are you sure you want to log out? This will clear all locally stored messages and data from this device."
    confirmLabel="Logout"
    confirmVariant="destructive"
    @confirm="logout"
  />
</template>

<style scoped>
/* Animation effects */
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Gradient text */
.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}

/* Improved shadows */
.shadow-sm {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* Blur effects */
.blur-3xl {
  --tw-blur: blur(64px);
  filter: var(--tw-blur);
}

/* Nexus Logo Styling */
.nexus-logo-container {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.nexus-settings-logo {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  z-index: 10;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  animation: pulse 3s infinite ease-in-out;
}

.logo-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  opacity: 0.2;
  filter: blur(10px);
  z-index: 5;
  animation: glow 3s infinite alternate ease-in-out;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes glow {
  0% { 
    opacity: 0.2;
    transform: scale(0.95);
  }
  100% { 
    opacity: 0.3;
    transform: scale(1.15);
  }
}
</style>
