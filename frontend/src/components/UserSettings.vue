<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { storageService } from '@/services/storage.service';
import { apiService } from '@/services/api.service';
import { User } from 'lucide-vue-next';

enum StorageType {
  RAM = 'ram',
  SERVER = 'server',
  FILE = 'file'
}
  
const router = useRouter();
const user = ref(storageService.getUser());
const token = storageService.getToken()!;
const UserId = storageService.getUser()!.uid;

const username = ref(user.value?.username || '');
const DisplayName = ref(user.value?.display_name || '');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const shadowMode = ref(user.value?.shadow_mode || false);
const fullNameSearch = ref(user.value?.full_name_search || false);

const isUpdating = ref(false);
const updateError = ref<string | null>(null);
const updateSuccess = ref<string | null>(null);
const storageType = ref(StorageType.SERVER); 

type User = {
  "username": string, 
  "password": string, 
  "displayName": string, 
  "shadowMode": boolean, 
  "fullNameSearch": boolean 
}


async function updateProfile(): Promise<void>{
   try {
      isUpdating.value = true;
      updateError.value = null;
      updateSuccess.value = null;

      // Password validation
      if (currentPassword.value) {
         if (!newPassword.value) {
            updateError.value = "New password is required";
            isUpdating.value = false;
            return;
         }
         
         if (newPassword.value !== confirmPassword.value) {
            updateError.value = "New passwords don't match";
            isUpdating.value = false;
            return;
         }
         const isPasswordCorrect = await apiService.verifyPassword(UserId, currentPassword.value, token);
         if (!isPasswordCorrect) {
            updateError.value = "Current password is incorrect";
            isUpdating.value = false;
            return;
         }
      }

      const userData: Partial<User> = {};
      
      if (username.value && username.value !== user.value?.username) {
         userData.username = username.value;
      }
      
      if (DisplayName.value && DisplayName.value !== user.value?.display_name) {
         userData.displayName = DisplayName.value;
      }
      
      if (currentPassword.value && newPassword.value) {
         userData.password = newPassword.value;
         // Include the current password for server-side verification
         userData.password = currentPassword.value;
      }

      userData.shadowMode = shadowMode.value;
      userData.fullNameSearch = fullNameSearch.value;
      
      if (Object.keys(userData).length === 0) {
         updateSuccess.value = "No changes to update";
         isUpdating.value = false;
         return;
      }
      
      const response = await apiService.updateUser(UserId, userData, token);
      
      const updatedUser = response;
      storageService.storeUser(updatedUser);
      user.value = updatedUser;
      
      currentPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      
      updateSuccess.value = "Profile updated successfully";
      return;
   } catch (error: any) {
      updateError.value = error.response?.data?.message || "Failed to update profile";
      return;
   } finally {
      isUpdating.value = false;
   }
}

function logout() {
  storageService.clearAuth();
  router.push('/login');
}
</script>

<template>
  <div class="h-full w-full overflow-y-auto p-6">
    <Card class="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>User Settings</CardTitle>
        <CardDescription>Manage your account settings and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="updateProfile" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <!-- Username -->
              <div class="space-y-2">
                <label for="username" class="text-sm font-medium">Username</label>
                <Input id="username" v-model="username" placeholder="Username" />
              </div>
              
              <!-- DisplayName -->
              <div class="space-y-2">
                <label for="display_name" class="text-sm font-medium">Display Name</label>
                <Input v-model="DisplayName" id="display_name" placeholder="Display Name" />
              </div>
            </div>

            <div class="space-y-4">
              <!-- Current Password -->
              <div class="space-y-2">
                <label for="current-password" class="text-sm font-medium">Current Password</label>
                <Input 
                  id="current-password" 
                  v-model="currentPassword" 
                  type="password" 
                  placeholder="Enter current password to change password"
                />
              </div>
              
              <!-- New Password -->
              <div class="space-y-2">
                <label for="new-password" class="text-sm font-medium">New Password</label>
                <Input 
                  id="new-password" 
                  v-model="newPassword" 
                  type="password" 
                  placeholder="Leave blank to keep current password"
                  :disabled="!currentPassword"
                />
              </div>
              
              <!-- Confirm Password -->
              <div class="space-y-2">
                <label for="confirm-password" class="text-sm font-medium">Confirm New Password</label>
                <Input 
                  id="confirm-password" 
                  v-model="confirmPassword" 
                  type="password" 
                  placeholder="Confirm new password"
                  :disabled="!currentPassword"
                />
              </div>
            </div>
          </div>
          
          <!-- Privacy Settings -->
          <div class="pt-4 border-t">
            <h3 class="text-lg font-medium mb-4">Privacy Preferences</h3>
            <div class="space-y-4">
              <!-- Shadow Mode -->
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shadow-mode"
                  v-model="shadowMode"
                  class="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label for="shadow-mode" class="text-sm font-medium">Shadow Mode (Only contacts can see your activity status)</label>
              </div>
              
              <!-- Full Name Search -->
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="full-name-search"
                  v-model="fullNameSearch"
                  class="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label for="full-name-search" class="text-sm font-medium">Allow people to find you by full name</label>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t">
            <h3 class="text-lg font-medium mb-4">Message Storage Settings</h3>
            <div class="space-y-4">
              <!-- Storage Type Selection -->
              <div class="space-y-2">
                <label for="storage-type" class="text-sm font-medium">Message Storage Type</label>
                <select 
                  id="storage-type" 
                  v-model="storageType" 
                  class="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="ram">RAM Storage</option>
                  <option value="server">Server Storage</option>
                  <option value="file">File Storage</option>
                </select>
                
                <!-- Description based on selection -->
                <div class="mt-2 text-sm text-gray-600 bg-gray-100 p-3 rounded">
                  <p v-if="storageType === 'ram'">
                    RAM Storage: Messages are only stored in memory and will be deleted when you log out. Most secure option but messages are not persistent.
                  </p>
                  <p v-else-if="storageType === 'server'">
                    Server Storage: Messages are stored securely on the server. Provides message history across devices but requires server trust.
                  </p>
                  <p v-else-if="storageType === 'file'">
                    File Storage: Messages are stored locally in encrypted files. Offers persistence without server storage, but only available on current device.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Error/Success Messages -->
          <div v-if="updateError" class="p-3 bg-destructive/10 text-destructive rounded">
            {{ updateError }}
          </div>
          <div v-if="updateSuccess" class="p-3 bg-green-100 text-green-800 rounded">
            {{ updateSuccess }}
          </div>
        </form>
      </CardContent>
      <CardFooter class="flex flex-col space-y-3">
        <Button 
          type="submit" 
          @click="updateProfile" 
          :disabled="isUpdating" 
          class="w-full"
        >
          <span v-if="isUpdating">Updating...</span>
          <span v-else>Update Profile</span>
        </Button>
        
        <Button 
          variant="destructive" 
          @click="logout" 
          class="w-full"
        >
          Log Out
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>