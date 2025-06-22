<template>
  <div class="w-full h-screen overflow-hidden">
    <!-- Router view will display the current route component -->
    <router-view />
    
    <!-- Portal target for floating menus and modals -->
    <div id="portal-target"></div>
    
    <!-- Toast container for notifications -->
    <ToastContainer
      :toasts="toasts"
      @close="closeToast"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { websocketService } from './services/websocket.service';
import { storageService } from './services/storage.service';
import { indexedDBService } from './services/indexeddb.service';
import ToastContainer from './components/toast/ToastContainer.vue';
import { useToast } from './composables/useToast';

const router = useRouter();
const { toasts, closeToast } = useToast();

// Initialize database and WebSocket connection if user is logged in
onMounted(async () => {
  // First initialize IndexedDB
  await indexedDBService.initDatabase();

  // Setup WebSocket if user is logged in
  const user = storageService.getUser();
  const token = storageService.getToken();

  if (user?.uid && token) {
    websocketService.connect(user.uid, token);
  }

  // Listen for route changes to handle WebSocket connections based on auth state
  router.beforeEach((_to, _from, next) => {
    const user = storageService.getUser();
    const token = storageService.getToken();
    const isAuthenticated = !!user && !!token;

    // Connect to WebSocket when user logs in or navigates while authenticated
    if (isAuthenticated && !websocketService.isConnected()) {
      websocketService.connect(user.uid, token);
    }
    // Disconnect from WebSocket when user logs out
    else if (!isAuthenticated && websocketService.isConnected()) {
      websocketService.disconnect();
    }

    next();
  });
});

// Clean up WebSocket connection when component unmounts (if needed)
// We're not including onUnmounted since it's not imported anymore
// If needed, add it back with: import { onMounted, onUnmounted } from 'vue';
</script>
