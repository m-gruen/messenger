<template>
  <div class="w-full h-screen overflow-hidden">
    <!-- Router view will display the current route component -->
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { websocketService } from './services/websocket.service';
import { storageService } from './services/storage.service';

const router = useRouter();

// Initialize WebSocket connection if user is logged in
onMounted(() => {
  const user = storageService.getUser();
  const token = storageService.getToken();
  
  if (user?.uid && token) {
    websocketService.connect(user.uid, token);
  }

  // Listen for route changes to handle WebSocket connections based on auth state
  router.beforeEach((to, from, next) => {
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

// Clean up WebSocket connection when component unmounts
onUnmounted(() => {
  websocketService.disconnect();
});
</script>
