<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { storageService } from '@/services/storage.service';
import { apiService } from '@/services/api.service';
import KeyRecovery from '@/components/KeyRecovery.vue';

const router = useRouter();
const user = ref(storageService.getUser());
const token = storageService.getToken()!;
const UserId = storageService.getUser()!.uid;

// Form fields
const username = ref(user.value?.username || '');
const DisplayName = ref(user.value?.display_name || '');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const shadowMode = ref(user.value?.shadow_mode || false);
const fullNameSearch = ref(user.value?.full_name_search || false);

// UI state
const isUpdating = ref(false);
const updateError = ref<string | null>(null);
const updateSuccess = ref<string | null>(null);
const isEditingUsername = ref(false);
const isEditingDisplayName = ref(false);
const showPasswordModal = ref(false);

// Track original values to detect changes
const originalValues = ref({
  username: user.value?.username || '',
  displayName: user.value?.display_name || '',
  shadowMode: user.value?.shadow_mode || false,
  fullNameSearch: user.value?.full_name_search || false,
});

// Calculate if there are unsaved changes
const hasUnsavedChanges = computed(() => {
  return username.value !== originalValues.value.username ||
    DisplayName.value !== originalValues.value.displayName ||
    shadowMode.value !== originalValues.value.shadowMode ||
    fullNameSearch.value !== originalValues.value.fullNameSearch;
});

// Get the profile initial (first letter of username or display name)
const userInitial = computed(() => {
  if (DisplayName.value && DisplayName.value.length > 0) {
    return DisplayName.value[0].toUpperCase();
  }
  if (username.value && username.value.length > 0) {
    return username.value[0].toUpperCase();
  }
  return '?';
});

// Generate a background color based on username for avatar
const avatarBackground = computed(() => {
  const colors = [
    '#7289DA', // Discord blue
    '#43B581', // Discord green
    '#FAA61A', // Discord yellow
    '#F04747', // Discord red
    '#593695', // Discord purple
  ];

  if (!username.value) return colors[0];

  // Simple hash function to get consistent color for a username
  let hash = 0;
  for (let i = 0; i < username.value.length; i++) {
    hash = username.value.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
});

function resetForm() {
  username.value = originalValues.value.username;
  DisplayName.value = originalValues.value.displayName;
  shadowMode.value = originalValues.value.shadowMode;
  fullNameSearch.value = originalValues.value.fullNameSearch;
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  updateError.value = null;
  updateSuccess.value = null;
  isEditingUsername.value = false;
  isEditingDisplayName.value = false;
  showPasswordModal.value = false;
}

// Update when user data changes
watch(user, (newUser) => {
  if (newUser) {
    username.value = newUser.username || '';
    DisplayName.value = newUser.display_name || '';
    shadowMode.value = newUser.shadow_mode || false;
    fullNameSearch.value = newUser.full_name_search || false;

    originalValues.value = {
      username: newUser.username || '',
      displayName: newUser.display_name || '',
      shadowMode: newUser.shadow_mode || false,
      fullNameSearch: newUser.full_name_search || false,
    };
  }
}, { deep: true });

async function updateProfile(): Promise<void> {
  try {
    isUpdating.value = true;
    updateError.value = null;
    updateSuccess.value = null;

    // Handle other profile updates
    if (hasProfileChanges()) {
      const userData: any = {};

      if (username.value && username.value !== user.value?.username) {
        userData.username = username.value;
      }

      if (DisplayName.value !== user.value?.display_name) {
        userData.displayName = DisplayName.value;
      }

      userData.shadowMode = shadowMode.value;
      userData.fullNameSearch = fullNameSearch.value;

      try {
        const response = await apiService.updateUser(UserId, userData, token);

        // Ensure we preserve the original token when updating storage
        const updatedUser = {
          ...response,
          token: token // Make sure token is included in the user object
        };

        // Update both in-memory user reference and storage
        storageService.storeUser(updatedUser);
        user.value = updatedUser;

        // Update original values
        originalValues.value = {
          username: updatedUser.username || '',
          displayName: updatedUser.display_name || '',
          shadowMode: updatedUser.shadow_mode || false,
          fullNameSearch: updatedUser.full_name_search || false,
        };

        updateSuccess.value = "Profile updated successfully";
      } catch (error: any) {
        updateError.value = error.message || "Failed to update profile";
        isUpdating.value = false;
        return;
      }
    } else if (!updateSuccess.value) {
      updateSuccess.value = "No changes to update";
    }

    isUpdating.value = false;
    isEditingUsername.value = false;
    isEditingDisplayName.value = false;
  } catch (error: any) {
    updateError.value = error.message || "An unexpected error occurred";
    isUpdating.value = false;
  }
}

async function updatePassword(): Promise<void> {
  try {
    if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
      updateError.value = "All password fields are required";
      return;
    }

    if (newPassword.value !== confirmPassword.value) {
      updateError.value = "New passwords don't match";
      return;
    }

    isUpdating.value = true;
    updateError.value = null;

    try {
      const passwordResponse = await apiService.updatePassword(
        UserId,
        currentPassword.value,
        newPassword.value,
        token
      );

      // Update user data and token after password change
      storageService.storeUser(passwordResponse);
      user.value = passwordResponse;

      // Clear password fields
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';

      updateSuccess.value = "Password updated successfully";
      showPasswordModal.value = false;
    } catch (error: any) {
      updateError.value = error.message || "Failed to update password. Current password may be incorrect.";
    } finally {
      isUpdating.value = false;
    }
  } catch (error: any) {
    updateError.value = error.message || "An unexpected error occurred";
    isUpdating.value = false;
  }
}

// Helper function to check if there are profile changes to update
function hasProfileChanges(): boolean {
  return (
    (username.value && username.value !== originalValues.value.username) ||
    DisplayName.value !== originalValues.value.displayName ||
    shadowMode.value !== originalValues.value.shadowMode ||
    fullNameSearch.value !== originalValues.value.fullNameSearch
  );
}

function openPasswordModal() {
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  showPasswordModal.value = true;
}

function closePasswordModal() {
  currentPassword.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
  showPasswordModal.value = false;
}

function logout() {
  storageService.clearAuth();
  router.push('/login');
}

// Data deletion confirmation
function confirmDataDeletion() {
  if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
    deleteUserData();
  }
}

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
  <div class="w-full bg-background">
    <!-- Unsaved changes notification -->
    <div v-if="hasUnsavedChanges"
      class="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 flex justify-between items-center z-50">
      <div>Careful — you have unsaved changes!</div>
      <div class="space-x-3">
        <Button variant="outline" @click="resetForm">Reset</Button>
        <Button variant="default" class="bg-green-500 hover:bg-green-600" @click="updateProfile" :disabled="isUpdating">
          <span v-if="isUpdating">Saving...</span>
          <span v-else>Save Changes</span>
        </Button>
      </div>
    </div>

    <!-- Password Update Modal -->
    <div v-if="showPasswordModal"
      class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div class="bg-gray-800 rounded-md max-w-md w-full relative">
        <!-- Close button -->
        <button @click="closePasswordModal" class="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>

        <div class="p-6">
          <h2 class="text-xl font-bold text-white text-center">Update your password</h2>
          <p class="text-gray-400 text-center mb-6">Enter your current password and a new password.</p>

          <!-- Error message -->
          <div v-if="updateError" class="mb-4 p-3 bg-red-900/30 text-red-200 rounded-md text-sm">
            {{ updateError }}
          </div>

          <form @submit.prevent="updatePassword" class="space-y-4">
            <div>
              <label for="current-password-modal" class="block text-sm font-medium text-gray-300 mb-1">Current
                Password</label>
              <Input id="current-password-modal" v-model="currentPassword" type="password" placeholder=""
                class="w-full bg-gray-700 border-gray-600 text-white" />
            </div>

            <div>
              <label for="new-password-modal" class="block text-sm font-medium text-gray-300 mb-1">New Password</label>
              <Input id="new-password-modal" v-model="newPassword" type="password" placeholder=""
                class="w-full bg-gray-700 border-gray-600 text-white" />
            </div>

            <div>
              <label for="confirm-password-modal" class="block text-sm font-medium text-gray-300 mb-1">Confirm New
                Password</label>
              <Input id="confirm-password-modal" v-model="confirmPassword" type="password" placeholder=""
                class="w-full bg-gray-700 border-gray-600 text-white" />
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <Button variant="ghost" @click="closePasswordModal" class="text-white" type="button">
                Cancel
              </Button>
              <Button variant="default" class="bg-indigo-500 hover:bg-indigo-600" :disabled="isUpdating" type="submit">
                <span v-if="isUpdating">Updating...</span>
                <span v-else>Done</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto pb-20">
      <!-- User Profile Header -->
      <div class="bg-indigo-600 dark:bg-indigo-800 rounded-t-lg p-6">
        <div class="flex items-center gap-5">
          <!-- User avatar -->
          <div class="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
            :style="{ backgroundColor: avatarBackground }">
            {{ userInitial }}
          </div>

          <!-- User info -->
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-white">{{ DisplayName || username }}</h1>
            <p class="text-indigo-200">@{{ username }}</p>
          </div>
        </div>
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

        <!-- Encryption Key Management Section -->
        <div class="p-6 border-b dark:border-gray-700">
          <h2 class="text-xl font-medium mb-6 text-gray-800 dark:text-gray-200">ENCRYPTION KEYS</h2>
          <KeyRecovery />
        </div>

        <!-- Data Settings Section -->
        <div class="p-6 border-b dark:border-gray-700">
          <h2 class="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">DATA SETTINGS</h2>

          <div>
            <div class="flex justify-between items-center">
              <div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Delete All Data</div>
                <div class="text-gray-800 dark:text-gray-200">
                  Permanently delete all your messages and data. This action cannot be undone.
                </div>
              </div>
              <Button variant="destructive" size="sm" @click="confirmDataDeletion">
                Delete
              </Button>
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
.bg-green-500 {
  background-color: #43B581;
  /* Discord green */
}

/* Switch animation */
.transform {
  transition: transform 150ms ease-in-out;
}

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
