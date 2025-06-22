<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/AuthStore';
import { apiService } from '@/services/api.service';
import { encryptionService } from '@/services/encryption.service';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';

const authStore = useAuthStore();
const user = computed(() => authStore.user);
const token = computed(() => authStore.token);
const { showError, showSuccess, showInfo } = useToast();

const isLoading = ref(false);
const importKey = ref('');
const showRegenerateConfirm = ref(false);
const showImportConfirm = ref(false);

const hasPrivateKey = computed(() => {
  return !!user.value?.private_key;
});

// Create an object with all the methods to avoid unused function warnings
const methods = {
  // Function to prompt for key regeneration confirmation
  confirmRegenerateKeys() {
    showRegenerateConfirm.value = true;
  },

  // Function to regenerate encryption keys
  async regenerateKeys() {
    if (!user.value || !token.value) {
      showError('You must be logged in to perform this action');
      return;
    }

    isLoading.value = true;

    try {
      const updatedUser = await apiService.regenerateKeys(user.value.uid, token.value);
      
      // Update the user in the store with the new keys
      authStore.setUser(updatedUser);
      
      showSuccess('Successfully generated new encryption keys');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to generate new keys');
      console.error('Key regeneration error:', err);
    } finally {
      isLoading.value = false;
    }
  },

  // Function to export private key
  exportPrivateKey() {
    if (!user.value?.private_key) {
      showError('No private key to export');
      return;
    }

    // Create a temporary textarea to copy to clipboard
    const textarea = document.createElement('textarea');
    textarea.value = user.value.private_key;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      showSuccess('Private key copied to clipboard');
    } catch (e) {
      showError('Failed to copy private key to clipboard');
    } finally {
      document.body.removeChild(textarea);
    }
  },

  // Function to prompt for key import confirmation
  confirmImportPrivateKey() {
    if (!importKey.value.trim()) {
      showError('Please enter a private key');
      return;
    }
    
    showImportConfirm.value = true;
  },
  
  // Function to import a private key
  async importPrivateKey() {
    if (!importKey.value.trim()) {
      showError('Please enter a private key');
      return;
    }

    if (!user.value || !token.value) {
      showError('You must be logged in to perform this action');
      return;
    }

    isLoading.value = true;

    try {
      const publicKey = await encryptionService.derivePublicKey(importKey.value.trim());
      
      const updatedUser = await apiService.updatePublicKey(user.value.uid, publicKey, token.value);
      
      updatedUser.private_key = importKey.value.trim();
      
      authStore.setUser(updatedUser);
      
      showSuccess('Successfully imported private key and updated public key on server');
      importKey.value = '';
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to import private key');
      console.error('Key import error:', err);
    } finally {
      isLoading.value = false;
    }
  }
};

onMounted(() => {
  // Check for private key on component mount
  if (!hasPrivateKey.value) {
    showInfo('No private key found. To send and receive encrypted messages, you need to generate a new key pair or import an existing private key.');
  }
});
</script>

<template>
  <div class="p-6 bg-card rounded-lg shadow border border-border">
    <h2 class="text-lg font-medium mb-4">Encryption Key Management</h2>
    
    <!-- Error and success messages are now handled by the toast system -->

    <div class="space-y-6">
      <div>
        <h3 class="font-medium mb-2">Private Key Status</h3>
        <div class="p-3 rounded-md" :class="hasPrivateKey ? 'bg-green-600/10' : 'bg-amber-600/10'">
          <p v-if="hasPrivateKey" class="text-green-600">
            <span class="inline-flex items-center">
              <svg class="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              Private key found
            </span>
          </p>
          <p v-else class="text-amber-600">
            <span class="inline-flex items-center">
              <svg class="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
              </svg>
              No private key found
            </span>
          </p>
          <p class="text-sm mt-2">
            {{ hasPrivateKey 
              ? 'Your private key is securely stored in your browser. You can send and receive encrypted messages.' 
              : 'You need to generate a new key pair to send and receive encrypted messages.' }}
          </p>
        </div>
      </div>

      <div v-if="hasPrivateKey" class="space-y-3">
        <h3 class="font-medium mb-2">Export Private Key</h3>
        <p class="text-sm text-muted-foreground">
          Export your private key to use it on another device. Keep this key secure and never share it with anyone.
        </p>
        <button 
          @click="methods.exportPrivateKey"
          class="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
        >
          Export Private Key
        </button>
      </div>

      <div class="space-y-3">
        <h3 class="font-medium mb-2">Import Private Key</h3>
        <p class="text-sm text-muted-foreground">
          If you have a backup of your private key, you can import it here.
          {{ hasPrivateKey ? 'This will replace your current private key.' : '' }}
        </p>
        <textarea 
          v-model="importKey" 
          placeholder="Paste your private key here"
          class="w-full p-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          rows="2"
        ></textarea>
        <button 
          @click="methods.confirmImportPrivateKey"
          class="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
          :disabled="!importKey.trim() || isLoading"
        >
          Import Key
        </button>
      </div>

      <div class="space-y-3">
        <h3 class="font-medium mb-2">{{ hasPrivateKey ? 'Regenerate' : 'Generate' }} Key Pair</h3>
        <p class="text-sm text-muted-foreground">
          {{ hasPrivateKey 
              ? 'Warning: Regenerating your key pair will prevent you from decrypting any previously received messages.' 
              : 'Generate a new key pair to enable encrypted messaging.' }}
        </p>
        <button 
          @click="hasPrivateKey ? methods.confirmRegenerateKeys() : methods.regenerateKeys()"
          class="w-full py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
          <span v-else>{{ hasPrivateKey ? 'Regenerate Key Pair' : 'Generate New Key Pair' }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Confirm Dialog for Key Regeneration -->
  <ConfirmDialog
    v-model:show="showRegenerateConfirm"
    title="Confirm Key Regeneration"
    message="Warning: Regenerating your encryption keys will prevent you from decrypting any previously received encrypted messages. This action cannot be undone. Are you sure you want to continue?"
    confirmLabel="Regenerate Keys"
    confirmVariant="destructive"
    @confirm="methods.regenerateKeys"
  />
  
  <!-- Confirm Dialog for Key Import -->
  <ConfirmDialog
    v-model:show="showImportConfirm"
    title="Confirm Key Import"
    message="Warning: Importing a private key will replace your current encryption keys and may result in losing access to previously received messages if the key doesn't match what was used to encrypt them. Are you sure you want to continue?"
    confirmLabel="Import Key"
    confirmVariant="destructive"
    @confirm="methods.importPrivateKey"
  />
</template>
