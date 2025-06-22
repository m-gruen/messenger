<script setup lang="ts">
import KeyRecovery from '@/components/settings/KeyRecovery.vue';
import { Key, ShieldCheck, Lock } from 'lucide-vue-next';
</script>

<template>
  <div>
    <!-- Main content -->
    <div class="bg-card rounded-xl shadow-lg">
      <!-- Error/Success Messages are now handled by the toast system -->

      <!-- Key Management Header Section -->
      <div class="p-6">
        <div class="flex items-center gap-3 mb-6">
          <div class="bg-gradient-to-r from-violet-500 to-purple-500 p-2 rounded-lg">
            <Key class="h-6 w-6 text-white" />
          </div>
          <h2 class="text-2xl font-semibold">Key Management</h2>
        </div>
        
        <!-- Security Info Banner -->
        <div class="bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20 p-4 rounded-lg overflow-hidden relative mb-6">
          <div class="flex items-start gap-4">
            <ShieldCheck class="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <p class="font-medium text-purple-800 dark:text-purple-300">Secure Encryption Keys</p>
              <p class="text-sm text-purple-700 dark:text-purple-400 mt-1">
                Manage your encryption keys used for secure end-to-end encrypted messaging. These keys ensure that only you and your contacts can read your conversations.
              </p>
            </div>
          </div>
          <div class="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-purple-500/10"></div>
          <div class="absolute -bottom-6 -right-10 h-24 w-24 rounded-full bg-purple-400/5"></div>
        </div>
        
        <!-- Key Recovery Component -->
        <KeyRecovery />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bg-green-500 {
  background-color: #43B581;
  /* Discord green */
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

/* Border for spinner */
.border-3 {
  border-width: 3px;
}

/* Custom gradients for cards */
.from-purple-500\/10 {
  --tw-gradient-from: rgb(168 85 247 / 0.1);
}

.to-violet-500\/10 {
  --tw-gradient-to: rgb(139 92 246 / 0.1);
}

/* Card hover effects */
.shadow-lg {
  transition: all 0.3s ease;
}

/* Animation for loading spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
