import { type AuthenticatedUser } from '@/models/user-model';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { storageService } from '@/services/storage.service';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<AuthenticatedUser | null>(null);

  // Initialize from storage
  const storedToken = storageService.getToken();
  const storedUser = storageService.getUser();

  if (storedToken) token.value = storedToken;
  if (storedUser) user.value = storedUser;

  const isAuthenticated = computed(() => !!token.value);

  function setToken(newToken: string, remember: boolean = false) {
    token.value = newToken;
    storageService.storeToken(newToken, remember);
  }

  function setUser(newUser: AuthenticatedUser, remember: boolean = false) {
    user.value = newUser;
    storageService.storeUser(newUser, remember);
  }

  function logout() {
    token.value = null;
    user.value = null;
    storageService.clearAuth();
  }

  return {
    token,
    user,
    isAuthenticated,
    setToken,
    setUser,
    logout
  };
});
