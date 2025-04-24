<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { storageService } from '@/services/storage.service';
import { ApiService, apiService } from '@/services/api.service';
import { User } from 'lucide-vue-next';

const router = useRouter();
const user = ref(storageService.getUser());
const token = storageService.getToken()!;
const UserId = storageService.getUser()!.uid;

const username = ref(user.value?.username || '');
const DisplayName = ref(user.value?.display_name || '');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const isUpdating = ref(false);
const updateError = ref<string | null>(null);
const updateSuccess = ref<string | null>(null);

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

      
      if (currentPassword.value) {
         if (!newPassword.value) {
            updateError.value = "New password is required";
            isUpdating.value = false;
         }
         
         if (newPassword.value !== confirmPassword.value) {
            updateError.value = "New passwords don't match";
            isUpdating.value = false;
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
      }

      
      if (Object.keys(userData).length === 0) {
         updateSuccess.value = "No changes to update";
         isUpdating.value = false;
      }
      

      const response = await apiService.updateUser(UserId,userData,token);
      
      
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
  storageService.clearAuth();
  router.push('/login');
}
</script>

<template>
  <div class="p-4 h-full overflow-y-auto">
    <div class="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>User Settings</CardTitle>
          <CardDescription>Manage your account settings and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <form @submit.prevent="updateProfile" class="space-y-4">
            <!-- Username -->
            <div class="space-y-2">
              <label for="username" class="text-sm font-medium">Username</label>
              <Input id="username" v-model="username" placeholder="Username" />
            </div>
            
            <!-- DisplayName -->
            <div class="space-y-2">
              <label for="display_name" class="text-sm font-medium">Display Name</label>
              <Input v-model="DisplayName" id="display_name" type="email" placeholder="Display Name " />
            </div>
            
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
            
            <!-- Error/Success Messages -->
            <div v-if="updateError" class="p-3 bg-destructive/10 text-destructive rounded">
              {{ updateError }}
            </div>
            <div v-if="updateSuccess" class="p-3 bg-green-100 text-green-800 rounded">
              {{ updateSuccess }}
            </div>
          </form>
        </CardContent>
        <CardFooter class="flex flex-col space-y-2">
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
  </div>
</template>