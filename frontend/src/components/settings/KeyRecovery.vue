<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/AuthStore';
import { apiService } from '@/services/api.service';
import { encryptionService } from '@/services/encryption.service';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { Check, AlertTriangle, RefreshCw, Download, Upload, KeyRound, Loader2 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';

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
  <div class="space-y-8">
    <!-- Key Status Card -->
    <div class="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 rounded-xl border p-5 shadow-sm">
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-3">
          <div :class="[
            'bg-gradient-to-br p-2 rounded-lg', 
            hasPrivateKey ? 'from-emerald-500 to-teal-600' : 'from-amber-500 to-orange-600'
          ]">
            <KeyRound class="h-5 w-5 text-white" />
          </div>
          <h3 class="text-lg font-medium">Private Key Status</h3>
        </div>
        <div class="px-3 py-1.5 rounded-full text-xs font-medium" 
          :class="hasPrivateKey ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'">
          {{ hasPrivateKey ? 'Active' : 'Missing' }}
        </div>
      </div>

      <!-- Status Info Box -->
      <div class="rounded-lg overflow-hidden bg-white dark:bg-slate-800/80 shadow-sm mb-4">
        <div class="p-4 flex items-start gap-4">
          <div class="rounded-full p-2 flex-shrink-0" :class="hasPrivateKey ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'">
            <Check v-if="hasPrivateKey" class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <AlertTriangle v-else class="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p class="font-medium mb-1" :class="hasPrivateKey ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'">
              {{ hasPrivateKey ? 'Private Key Found' : 'No Private Key Found' }}
            </p>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              {{ hasPrivateKey 
                ? 'Your private key is securely stored in your browser. You can send and receive encrypted messages.' 
                : 'You need to generate a new key pair to send and receive encrypted messages.' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Cards Container -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Export Key Card -->
      <div v-if="hasPrivateKey" class="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30 p-4 shadow-sm">
        <div class="flex items-center gap-3 mb-3">
          <div class="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-lg">
            <Download class="h-5 w-5 text-white" />
          </div>
          <div class="font-medium text-blue-800 dark:text-blue-200">Export Private Key</div>
        </div>
        <p class="text-sm text-blue-700 dark:text-blue-300/70 mb-4">
          Export your private key to use it on another device. Keep this key secure and never share it with anyone.
        </p>
        <Button class="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
          @click="methods.exportPrivateKey">
          <Download class="h-4 w-4 mr-2" />
          Export Private Key
        </Button>
      </div>

      <!-- Import Key Card -->
      <div class="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800/30 p-4 shadow-sm">
        <div class="flex items-center gap-3 mb-3">
          <div class="bg-gradient-to-br from-violet-500 to-purple-600 p-2 rounded-lg">
            <Upload class="h-5 w-5 text-white" />
          </div>
          <div class="font-medium text-violet-800 dark:text-violet-200">Import Private Key</div>
        </div>
        <p class="text-sm text-violet-700 dark:text-violet-300/70 mb-4">
          If you have a backup of your private key, you can import it here.
          {{ hasPrivateKey ? 'This will replace your current private key.' : '' }}
        </p>
        <textarea 
          v-model="importKey" 
          placeholder="Paste your private key here"
          class="w-full p-3 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 mb-3 bg-white/80 dark:bg-slate-800/80"
          rows="2"
        ></textarea>
        <Button class="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          @click="methods.confirmImportPrivateKey"
          :disabled="!importKey.trim() || isLoading">
          <Upload class="h-4 w-4 mr-2" />
          Import Key
        </Button>
      </div>

      <!-- Generate Key Card -->
      <div :class="[
        'bg-gradient-to-r rounded-xl border p-4 shadow-sm',
        hasPrivateKey 
          ? 'from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 border-rose-200 dark:border-rose-800/30' 
          : 'from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20 border-teal-200 dark:border-teal-800/30'
      ]">
        <div class="flex items-center gap-3 mb-3">
          <div :class="[
            'bg-gradient-to-br p-2 rounded-lg',
            hasPrivateKey ? 'from-rose-500 to-red-600' : 'from-teal-500 to-green-600'
          ]">
            <RefreshCw class="h-5 w-5 text-white" />
          </div>
          <div :class="[
            'font-medium',
            hasPrivateKey ? 'text-rose-800 dark:text-rose-200' : 'text-teal-800 dark:text-teal-200'
          ]">
            {{ hasPrivateKey ? 'Regenerate' : 'Generate' }} Key Pair
          </div>
        </div>
        <p :class="[
          'text-sm mb-4',
          hasPrivateKey ? 'text-rose-700 dark:text-rose-300/70' : 'text-teal-700 dark:text-teal-300/70'
        ]">
          {{ hasPrivateKey 
              ? 'Warning: Regenerating your key pair will prevent you from decrypting any previously received messages.' 
              : 'Generate a new key pair to enable encrypted messaging.' }}
        </p>
        <Button 
          :class="[
            'w-full text-white',
            hasPrivateKey 
              ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700' 
              : 'bg-gradient-to-r from-teal-500 to-green-600 hover:from-teal-600 hover:to-green-700'
          ]"
          @click="hasPrivateKey ? methods.confirmRegenerateKeys() : methods.regenerateKeys()"
          :disabled="isLoading">
          <span v-if="isLoading" class="flex items-center justify-center">
            <Loader2 class="animate-spin h-4 w-4 mr-2" />
            Processing...
          </span>
          <template v-else>
            <RefreshCw class="h-4 w-4 mr-2" />
            <span>{{ hasPrivateKey ? 'Regenerate Key Pair' : 'Generate New Key Pair' }}</span>
          </template>
        </Button>
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
