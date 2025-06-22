<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { storageService } from '@/services/storage.service';
import { apiService } from '@/services/api.service';
import { useToast } from '@/composables/useToast';
import { Shield, EyeOff, Search, Save, XCircle, Loader2 } from 'lucide-vue-next';

const user = ref(storageService.getUser());
const token = storageService.getToken()!;
const UserId = storageService.getUser()!.uid;
const { showError, showSuccess, showInfo } = useToast();

// Form fields
const shadowMode = ref(user.value?.shadow_mode || false);
const fullNameSearch = ref(user.value?.full_name_search || false);

// UI state
const isUpdating = ref(false);
const saveSuccess = ref(false);

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
    saveSuccess.value = false;

    // Handle privacy settings updates
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

        // Update both in-memory user reference and storage
        storageService.storeUser(updatedUser);
        user.value = updatedUser;

        // Update original values
        originalValues.value = {
          shadowMode: updatedUser.shadow_mode || false,
          fullNameSearch: updatedUser.full_name_search || false,
        };

        saveSuccess.value = true;
        showSuccess("Privacy settings updated successfully");
        
        // Reset success indicator after a delay
        setTimeout(() => {
          saveSuccess.value = false;
        }, 3000);
      } catch (error: any) {
        showError(error.message || "Failed to update privacy settings");
        isUpdating.value = false;
        return;
      }
    } else {
      showInfo("No changes to update");
    }

    isUpdating.value = false;
  } catch (error: any) {
    showError(error.message || "An unexpected error occurred");
    isUpdating.value = false;
  }
}

function resetForm() {
  shadowMode.value = originalValues.value.shadowMode;
  fullNameSearch.value = originalValues.value.fullNameSearch;
}

</script>

<template>
  <div>
    <!-- Main content -->
    <div class="bg-card rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
      <!-- Error/Success Messages are handled by the toast system -->

      <!-- Header Section -->
      <div class="relative bg-gradient-to-r from-purple-500 to-indigo-600 dark:from-purple-700 dark:to-indigo-800 p-6">
        <!-- Decorative circles -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mt-20 -mr-20"></div>
        <div class="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -mb-24 -ml-24"></div>
        <div class="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full -mt-16"></div>
        
        <div class="relative flex items-center gap-3 mb-3">
          <div class="bg-gradient-to-br from-purple-400 to-indigo-500 p-3 rounded-xl shadow-xl">
            <Shield class="h-6 w-6 text-white" />
          </div>
          <h2 class="text-2xl font-bold text-white">Privacy Settings</h2>
        </div>
        
        <p class="relative text-purple-50 ml-12 max-w-xl text-base">
          Control how others can find and interact with you on the platform.
          These settings help protect your privacy and secure your account.
        </p>
      </div>

      <!-- Privacy Settings Section -->
      <div class="p-6 sm:p-8">
        <!-- Settings Cards -->
        <div class="space-y-8">
          <!-- Info Banner -->
          <div class="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 p-4 rounded-xl overflow-hidden relative backdrop-blur-sm">
            <div class="flex items-start gap-4">
              <div class="bg-gradient-to-br from-purple-400/20 to-indigo-500/20 p-2 rounded-lg">
                <Shield class="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              </div>
              <div>
                <p class="font-medium text-purple-800 dark:text-purple-300">Your Privacy Matters</p>
                <p class="text-sm text-purple-700 dark:text-purple-400 mt-1 max-w-lg">
                  These settings determine who can find you and how you appear to others. 
                  Adjust them according to your privacy preferences to ensure the level of 
                  visibility that makes you comfortable.
                </p>
              </div>
            </div>
            <div class="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-purple-500/10"></div>
            <div class="absolute -bottom-6 -right-10 h-24 w-24 rounded-full bg-purple-400/5"></div>
          </div>

          <!-- Shadow Mode Toggle Card -->
          <div class="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md hover:translate-y-[-2px]">
            <div class="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/50 px-6 py-4">
              <div class="flex items-center gap-2">
                <div class="bg-gradient-to-br from-indigo-400/20 to-indigo-600/20 p-1.5 rounded-lg">
                  <EyeOff class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 class="font-medium text-lg text-slate-800 dark:text-slate-200">Shadow Mode</h3>
              </div>
            </div>
            <div class="p-6">
              <div class="flex justify-between items-start gap-8">
                <div class="flex-1">
                  <p class="text-slate-600 dark:text-slate-300 mb-3">
                    Only contacts can see your profile when Shadow Mode is active. Other users will not 
                    be able to search for or find you. This keeps your account more private and secure.
                  </p>
                  <div v-if="shadowMode" class="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-2 bg-emerald-50/50 dark:bg-emerald-900/20 p-2 rounded-lg w-fit">
                    <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span>Shadow mode is active</span>
                  </div>
                  <div v-else class="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium mt-2 bg-amber-50/50 dark:bg-amber-900/20 p-2 rounded-lg w-fit">
                    <div class="h-2 w-2 rounded-full bg-amber-500"></div>
                    <span>Your profile is publicly visible</span>
                  </div>
                </div>
                
                <!-- Modern Toggle Switch -->
                <div class="relative inline-block">
                  <button 
                    @click="shadowMode = !shadowMode"
                    class="w-14 h-7 flex items-center rounded-full p-1 duration-300 cursor-pointer shadow-inner"
                    :class="shadowMode ? 'bg-gradient-to-r from-indigo-500 to-purple-600 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'"
                  >
                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform duration-300"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Full Name Search Toggle Card -->
          <div class="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md hover:translate-y-[-2px]">
            <div class="border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/50 px-6 py-4">
              <div class="flex items-center gap-2">
                <div class="bg-gradient-to-br from-blue-400/20 to-blue-600/20 p-1.5 rounded-lg">
                  <Search class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 class="font-medium text-lg text-slate-800 dark:text-slate-200">Full Name Search</h3>
              </div>
            </div>
            <div class="p-6">
              <div class="flex justify-between items-start gap-8">
                <div class="flex-1">
                  <p class="text-slate-600 dark:text-slate-300 mb-3">
                    When enabled, people can only find you by entering your exact username. 
                    When disabled, people can find you using partial username matches, 
                    making your profile easier to discover.
                  </p>
                  <div v-if="fullNameSearch" class="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-2 bg-emerald-50/50 dark:bg-emerald-900/20 p-2 rounded-lg w-fit">
                    <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span>Exact username search only</span>
                  </div>
                  <div v-else class="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium mt-2 bg-amber-50/50 dark:bg-amber-900/20 p-2 rounded-lg w-fit">
                    <div class="h-2 w-2 rounded-full bg-amber-500"></div>
                    <span>Partial username search allowed</span>
                  </div>
                </div>
                
                <!-- Modern Toggle Switch -->
                <div class="relative inline-block">
                  <button 
                    @click="fullNameSearch = !fullNameSearch"
                    class="w-14 h-7 flex items-center rounded-full p-1 duration-300 cursor-pointer shadow-inner"
                    :class="fullNameSearch ? 'bg-gradient-to-r from-blue-500 to-cyan-600 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'"
                  >
                    <div class="bg-white w-5 h-5 rounded-full shadow-md transform duration-300"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save changes button -->
      <div class="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-900/60 border-t border-slate-200 dark:border-slate-700/30">
        <div class="flex items-center justify-between">
          <div class="text-sm">
            <div v-if="hasUnsavedChanges" class="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <div class="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
              <span>You have unsaved changes</span>
            </div>
            <div v-else-if="saveSuccess" class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <div class="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span>Settings saved successfully</span>
            </div>
            <div v-else>&nbsp;</div>
          </div>
          <div class="flex gap-3 ml-auto">
            <Button 
              v-if="hasUnsavedChanges" 
              variant="outline" 
              @click="resetForm" 
              class="border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              <XCircle class="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              variant="default"
              class="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300"
              @click="updatePrivacySettings" 
              :disabled="isUpdating || !hasUnsavedChanges">
              <Loader2 class="h-4 w-4 mr-2 animate-spin" v-if="isUpdating" />
              <Save class="h-4 w-4 mr-2" v-else />
              <span v-if="isUpdating">Saving...</span>
              <span v-else>Save Changes</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom colors */
.bg-green-500 {
  background-color: #43B581; /* Discord green */
}

/* Transitions and animations */
.transform {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.hover\:translate-y-\[-2px\]:hover {
  transform: translateY(-2px);
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.animate-pulse {
  animation: pulse 1.5s ease-in-out infinite;
}

/* Gradients and shadows */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.shadow-xl {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.hover\:shadow-md:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Input field styling */
input,
select {
  border-width: 2px !important;
  transition: all 0.2s ease-in-out !important;
}

.dark input,
.dark select {
  color: white !important;
  background-color: #1F2937 !important;
}

/* Custom gradients for cards */
.from-purple-500\/10 {
  --tw-gradient-from: rgb(168 85 247 / 0.1);
}

.to-indigo-500\/10 {
  --tw-gradient-to: rgb(99 102 241 / 0.1);
}

/* Enhanced toggle states */
.bg-emerald-50\/50 {
  background-color: rgba(236, 253, 245, 0.5);
}

.dark .bg-emerald-900\/20 {
  background-color: rgba(6, 78, 59, 0.2);
}

.bg-amber-50\/50 {
  background-color: rgba(255, 251, 235, 0.5);
}

.dark .bg-amber-900\/20 {
  background-color: rgba(120, 53, 15, 0.2);
}

/* Remove extra margins to prevent unexpected spacing */
.max-w-3xl {
  margin-top: 0;
}

/* Add backdrop blur effect */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}
</style>