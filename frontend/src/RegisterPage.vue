<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-background">
    <div class="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-border">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold">Create Account</h1>
        <p class="text-muted-foreground mt-2">Sign up to start messaging securely</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div class="space-y-2">
          <label for="username" class="text-sm font-medium">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Choose a username"
            class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        
        <div class="space-y-2">
          <label for="password" class="text-sm font-medium">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Create a password"
            class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        
        <div class="space-y-2">
          <label for="confirmPassword" class="text-sm font-medium">Confirm Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        
        <div class="flex items-center">
          <input
            id="remember-me"
            v-model="rememberMe"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label for="remember-me" class="ml-2 block text-sm text-muted-foreground">
            Remember me
          </label>
        </div>
        
        <div v-if="error" class="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {{ error }}
        </div>
        
        <button
          type="submit"
          class="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Registering...
          </span>
          <span v-else>Register</span>
        </button>
        
        <div class="text-center text-sm">
          Already have an account?
          <router-link to="/login" class="text-primary hover:underline">Login</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/AuthStore';
import { apiService } from './services/api.service';

const router = useRouter();
const authStore = useAuthStore();
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const isLoading = ref(false);
const rememberMe = ref(false);

async function handleRegister() {
  error.value = '';

  if (!username.value || !password.value) {
    error.value = 'Username and password are required';
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  isLoading.value = true;
  try {
    const user = await apiService.register(username.value, password.value);
    
    authStore.setToken(user.token, rememberMe.value);
    authStore.setUser(user, rememberMe.value);

    // Redirect to home page
    router.push('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Registration failed';
    console.error('Registration error:', err);
  } finally {
    isLoading.value = false;
  }
}
</script>
