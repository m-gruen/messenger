<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { storageService } from '@/services/storage.service';
import { apiService } from '@/services/api.service';

const user = ref(storageService.getUser());
const token = storageService.getToken()!;
const UserId = storageService.getUser()!.uid;

// Form fields
const shadowMode = ref(user.value?.shadow_mode || false);
const fullNameSearch = ref(user.value?.full_name_search || false);

// UI state
const isUpdating = ref(false);
const updateError = ref<string | null>(null);
const updateSuccess = ref<string | null>(null);

// Track original values to detect changes
const originalValues = ref({
  shadowMode: user.value?.shadow_mode || false,
  fullNameSearch: user.value?.full_name_search || false,
});

// Calculate if there are unsaved changes
const hasUnsavedChanges = computed(() => {
  return shadowMode.value !== originalValues.value.shadowMode ||
    fullNameSearch.value !== originalValues.value.fullNameSearch;
});

// Update when user data changes
watch(user, (newUser) => {
  if (newUser) {
    shadowMode.value = newUser.shadow_mode || false;
    fullNameSearch.value = newUser.full_name_search || false;

    originalValues.value = {
      shadowMode: newUser.shadow_mode || false,
      fullNameSearch: newUser.full_name_search || false,
    };
  }
}, { deep: true });

async function updatePrivacySettings(): Promise<void> {
  try {
    isUpdating.value = true;
    updateError.value = null;
    updateSuccess.value = null;

    // Handle other profile updates
    if (hasUnsavedChanges.value) {
      const userData: any = {
        shadowMode: shadowMode.value,
        fullNameSearch: fullNameSearch.value,
      };

      try {
        const response = await apiService.updateUser(UserId, userData, token);

        // Ensure we preserve the original token when updating storage
        const updatedUser = {
          ...response,
          token: token // Make sure token is included in the user object
        };

        // Check if the user originally used persistent storage (localStorage)
        const isPersistent = localStorage.getItem('user') !== null;

        // Update both in-memory user reference and persistent storage
        storageService.storeUser(updatedUser, isPersistent);
        user.value = updatedUser;

        // Update original values
        originalValues.value = {
          shadowMode: updatedUser.shadow_mode || false,
          fullNameSearch: updatedUser.full_name_search || false,
        };

        updateSuccess.value = "Privacy settings updated successfully";
      } catch (error: any) {
        updateError.value = error.message || "Failed to update privacy settings";
        isUpdating.value = false;
        return;
      }
    } else if (!updateSuccess.value) {
      updateSuccess.value = "No changes to update";
    }

    isUpdating.value = false;
  } catch (error: any) {
    updateError.value = error.message || "An unexpected error occurred";
    isUpdating.value = false;
  }
}

function resetForm() {
  shadowMode.value = originalValues.value.shadowMode;
  fullNameSearch.value = originalValues.value.fullNameSearch;
  updateError.value = null;
  updateSuccess.value = null;
}
</script>

<template>
  <div>
    <!-- Main content -->
    <div class="bg-card rounded-lg shadow-md">
      <!-- Error/Success Messages -->
      <div v-if="updateError"
        class="p-4 bg-destructive/10 text-destructive border-l-4 border-destructive">
        {{ updateError }}
      </div>
      <div v-if="updateSuccess"
        class="p-4 bg-green-100 dark:bg-green-900/10 text-green-800 dark:text-green-400 border-l-4 border-green-500">
        {{ updateSuccess }}
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
          <!-- Toggle Switch -->
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
          <!-- Toggle Switch -->
          <div class="relative inline-block w-10 h-6 cursor-pointer" @click="fullNameSearch = !fullNameSearch">
            <div class="w-10 h-6 bg-gray-500 rounded-full transition-colors duration-200 ease-in-out"
              :class="{ '!bg-green-500': fullNameSearch }"></div>
            <div
              class="absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out"
              :class="{ 'translate-x-4': fullNameSearch }"></div>
          </div>
        </div>
      </div>

      <!-- Save changes button -->
      <div class="p-6 border-t border-border">
        <Button 
          variant="default" 
          @click="updatePrivacySettings" 
          :disabled="isUpdating || !hasUnsavedChanges"
        >
          <span v-if="isUpdating">Saving...</span>
          <span v-else>Save Changes</span>
        </Button>
        <Button 
          v-if="hasUnsavedChanges"
          variant="ghost" 
          @click="resetForm" 
          class="ml-2"
        >
          Reset
        </Button>
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