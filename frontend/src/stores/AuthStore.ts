import type { AuthenticatedUser } from '@/models/user-model';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface User {
  uid: number;
  username: string;
  created_at: Date | string;
  token: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<User | null>(null);

  const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
  const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

  if (storedToken) token.value = storedToken;
  if (storedUser) {
    try {
      user.value = JSON.parse(storedUser);
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }

  const isAuthenticated = computed(() => !!token.value);

  function setToken(newToken: string, remember: boolean = false) {
    token.value = newToken;
    if (remember) {
      localStorage.setItem('token', newToken);
    } else {
      sessionStorage.setItem('token', newToken);
    }
  }

  function setUser(newUser: AuthenticatedUser, remember: boolean = false) {
    user.value = newUser;
    if (remember) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      sessionStorage.setItem('uid', JSON.stringify(newUser.uid));
      sessionStorage.setItem('username', JSON.stringify(newUser.username));
      sessionStorage.setItem('created_at', JSON.stringify(newUser.created_at));
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
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
