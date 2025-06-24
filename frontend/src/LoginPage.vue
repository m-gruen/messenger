<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-background">
    <div class="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-border">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold">Welcome Back</h1>
        <p class="text-muted-foreground mt-2">Login to your secure messenger</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4" autocomplete="off">
        <!-- Add hidden fields to trick browser autofill -->
        <input type="text" style="display:none" />
        <input type="password" style="display:none" />
        
        <div class="space-y-2">
          <label for="username" class="text-sm font-medium">Username</label>
          <input id="username" v-model="username" type="text" placeholder="Enter username"
            class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            autocomplete="off" required />
        </div>

        <div class="space-y-2">
          <label for="password" class="text-sm font-medium">Password</label>
          <input id="password" v-model="password" type="password" placeholder="Enter password"
            class="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            required />
        </div>



        <div v-if="error" class="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {{ error }}
        </div>

        <button type="submit"
          class="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          :disabled="isLoading">
          <span v-if="isLoading" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg"
              fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
              </path>
            </svg>
            Logging in...
          </span>
          <span v-else>Login</span>
        </button>

        <div class="text-center text-sm">
          Don't have an account?
          <router-link to="/register" class="text-primary hover:underline">Register</router-link>
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
const error = ref('');
const isLoading = ref(false);

async function handleLogin() {
  error.value = '';

  if (!username.value || !password.value) {
    error.value = 'Username and password are required';
    return;
  }

  isLoading.value = true;
  try {
    const user = await apiService.login(username.value, password.value);
    
    authStore.setToken(user.token);
    authStore.setUser(user);

    router.push('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed';
    console.error('Login error:', err);
  } finally {
    isLoading.value = false;
  }
}
</script>
