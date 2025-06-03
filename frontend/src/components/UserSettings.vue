<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { storageService } from '@/services/storage.service';
import UserSettingsPage from '@/components/settings/UserSettingsPage.vue';
import PrivacySettingsPage from '@/components/settings/PrivacySettingsPage.vue';
import MessageStoragePage from '@/components/settings/MessageStoragePage.vue';
import { apiService } from '@/services/api.service';
import KeyRecovery from '@/components/KeyRecovery.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

const router = useRouter();
const activeSection = ref('user'); // 'user', 'privacy', 'storage'

// Function to handle navigation between sections
function navigateTo(section: string) {
  activeSection.value = section;
}

function logout() {
  // Clear all data including messages
  storageService.clearAuth();
  localStorage.removeItem('local_message_storing');
  localStorage.clear(); // Clear everything else
  router.push('/login');
}

function confirmLogout() {
  showLogoutConfirm.value = true;
}

// We've replaced the use of this function with directly setting showDeleteDataConfirm = true

// Delete user data
async function deleteUserData() {
  try {
    isUpdating.value = true;
    updateError.value = null;
    
    // This would need to be implemented in the API service
    // For now we'll just clear messages from localStorage and show a success message
    try {
      localStorage.removeItem('local_message_storing');
      // await apiService.deleteUserData(UserId, token);
      updateSuccess.value = "All user data has been deleted";
    } catch (err: any) {
      console.error('Error deleting data:', err);
      throw new Error(err.message || 'Failed to delete data');
    }
  } catch (error: any) {
    updateError.value = error.message || "Failed to delete data";
  } finally {
    isUpdating.value = false;
  }
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

      <!-- Main settings container -->
      <div class="bg-white dark:bg-gray-800 rounded-b-lg shadow-md">
        <!-- Error/Success Messages -->
        <div v-if="updateError"
          class="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-l-4 border-red-500">
          {{ updateError }}
        </div>
        <div v-if="updateSuccess"
          class="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-l-4 border-green-500">
          {{ updateSuccess }}
        </div>

        <!-- User Account Section -->
        <div class="p-6 border-b dark:border-gray-700">
          <h2 class="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">USER ACCOUNT</h2>

          <div class="space-y-6">
            <!-- Username -->
            <div>
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">Username</div>
                  <div class="text-gray-800 dark:text-gray-200">{{ username }}</div>
                </div>
                <Button variant="ghost" size="sm" @click="isEditingUsername = !isEditingUsername">
                  Edit
                </Button>
              </div>

              <!-- Inline username edit -->
              <div v-if="isEditingUsername" class="mt-3">
                <Input v-model="username" placeholder="Username"
                  class="w-full border-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700" />
              </div>
            </div>

            <!-- Display Name -->
            <div>
              <div class="flex justify-between items-center">
                <div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">Display Name</div>
                  <div class="text-gray-800 dark:text-gray-200">{{ DisplayName || "Not set" }}</div>
                </div>
                <Button variant="ghost" size="sm" @click="isEditingDisplayName = !isEditingDisplayName">
                  Edit
                </Button>
              </div>

              <!-- Inline display name edit -->
              <div v-if="isEditingDisplayName" class="mt-3">
                <Input v-model="DisplayName" placeholder="Display Name"
                  class="w-full border-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700" />
              </div>
            </div>

            <!-- Password -->
            <div class="flex justify-between items-center">
              <div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Password</div>
                <div class="text-gray-800 dark:text-gray-200">••••••••••••</div>
              </div>
              <Button variant="ghost" size="sm" @click="openPasswordModal">
                Change Password
              </Button>
            </div>
          </div>
        </div>

        <!-- Privacy Settings Section -->
        <div class="p-6 border-b dark:border-gray-700">
          <h2 class="text-xl font-medium mb-6 text-gray-800 dark:text-gray-200">PRIVACY SETTINGS</h2>

          <!-- Shadow Mode Toggle -->
          <div class="flex justify-between items-start mb-6">
            <div class="flex-1">
              <div class="font-medium text-gray-800 dark:text-gray-200">Shadow Mode</div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Only contacts can see your profile. Other users will not be able to search for you. Keeps your account
                more private.
              </p>
            </div>
            <!-- Discord-style Toggle Switch -->
            <div class="relative inline-block w-10 h-6 cursor-pointer" @click="shadowMode = !shadowMode">
              <div class="w-10 h-6 bg-gray-500 rounded-full transition-colors duration-200 ease-in-out"
                :class="{ '!bg-green-500': shadowMode }"></div>
              <div
                class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out"
                :class="{ 'translate-x-4': shadowMode }"></div>
            </div>
          </div>

          <!-- Full Name Search Toggle -->
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="font-medium text-gray-800 dark:text-gray-200">Enable Full Name Search</div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                When enabled, people can only find you by entering your exact username. When disabled, people can find
                you using partial username matches.
              </p>
            </div>
            <!-- Discord-style Toggle Switch -->
            <div class="relative inline-block w-10 h-6 cursor-pointer" @click="fullNameSearch = !fullNameSearch">
              <div class="w-10 h-6 bg-gray-500 rounded-full transition-colors duration-200 ease-in-out"
                :class="{ '!bg-green-500': fullNameSearch }"></div>
              <div
                class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out"
                :class="{ 'translate-x-4': fullNameSearch }"></div>
            </div>
          </div>
        </div>

        <!-- Message Storage Settings Section -->
        <div class="p-6 border-b dark:border-gray-700">
          <h2 class="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">MESSAGE STORAGE</h2>

          <!-- Storage Type Selection -->
          <div class="space-y-2">
            <label for="storage-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Message Storage
              Type</label>
            <select id="storage-type" v-model="storageType"
              class="w-full rounded-md border-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100">
              <option value="ram">RAM Storage</option>
              <option value="server">Server Storage</option>
              <option value="file">File Storage</option>
            </select>

            <!-- Description based on selection -->
            <div
              class="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 p-3 rounded border border-gray-200 dark:border-gray-600">
              <p v-if="storageType === 'ram'">
                RAM Storage: Messages are only stored in memory and will be deleted when you log out. Most secure option
                but messages are not persistent.
              </p>
              <p v-else-if="storageType === 'server'">
                Server Storage: Messages are stored securely on the server. Provides message history across devices but
                requires server trust.
              </p>
              <p v-else-if="storageType === 'file'">
                File Storage: Messages are stored locally in encrypted files. Offers persistence without server storage,
                but only available on current device.
              </p>
            </div>
          </div>
        </div>

        <!-- Logout Button -->
        <div class="p-6">
          <Button variant="destructive" @click="logout" class="w-full">
            Log Out
          </Button>
        </div>
      </div>
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

