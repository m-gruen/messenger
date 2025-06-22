<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { storageService } from '@/services/storage.service';
import { indexedDBService } from '@/services/indexeddb.service';
import { useMessageStore } from '@/stores/MessageStore';
import { useContactStore } from '@/stores/ContactStore';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useToast } from '@/composables/useToast';
import { Database, Save, UploadCloud, Trash2, HardDrive, ShieldCheck, RefreshCw, User } from 'lucide-vue-next';

const UserId = storageService.getUser()!.uid;
const messageStore = useMessageStore();
const contactStore = useContactStore();
const { showError, showSuccess } = useToast();

// UI state
const showClearMessagesConfirmation = ref(false);
const isDownloadingMessages = ref(false);
const isDeletingMessages = ref(false);

// Add this for the file input reference
const fileInputRef = ref<HTMLInputElement | null>(null);

// Storage usage state
const totalStorageUsage = ref<number>(0);
const storageUsageByContact = ref<Array<{
    contactId: number;
    bytesUsed: number;
    percentage: number;
    messagesCount: number;
    displayName: string;
}>>([]);
const isLoadingStorageData = ref<boolean>(false);

// Load storage usage information
async function loadStorageUsage() {
    isLoadingStorageData.value = true;
    
    try {
        // Get total storage size
        totalStorageUsage.value = await indexedDBService.calculateTotalStorageUsage();
        
        // Get usage by contact
        const contactUsage = await indexedDBService.getStorageUsageByContact(UserId);
        
        // Enrich with contact display names
        const enrichedUsage = contactUsage.map(contact => {
            const userInfo = contactStore.getUserInfo(contact.contactId);
            const contactFromList = contactStore.contacts.find(c => c.contactUserId === contact.contactId);
            
            return {
                ...contact,
                displayName: userInfo?.display_name || 
                    contactFromList?.display_name || 
                    contactFromList?.username || 
                    `User ${contact.contactId}`
            };
        });
        
        storageUsageByContact.value = enrichedUsage;
    } catch (error) {
        console.error('Failed to load storage usage:', error);
    } finally {
        isLoadingStorageData.value = false;
    }
}

// Format bytes to human-readable format
function formatBytes(bytes: number): string {
    return indexedDBService.formatBytes(bytes);
}

// Function to open the file browser dialog for message restore
function openFileDialog() {
    // Only open if not currently in a download/upload operation
    if (fileInputRef.value && !isDownloadingMessages.value) {
        // Clear the input first to ensure change event fires even for the same file
        fileInputRef.value.value = '';
        fileInputRef.value.click();
        console.log('File dialog opened');
    } else {
        console.log('File dialog could not be opened');
    }
}

function openClearMessagesConfirmation() {
    showClearMessagesConfirmation.value = true;
}

// Message storage management
// Backup all messages to a JSON file
async function backupMessages() {
    if (isDownloadingMessages.value) return;

    isDownloadingMessages.value = true;

    try {
        // First make sure we have all messages from the server
        await messageStore.storeAllContactMessages(UserId);

        // Create a backup object with metadata
        const backup = {
            version: 2,
            userId: UserId,
            timestamp: new Date().toISOString(),
            data: {} as Record<string, any>
        };

        // Get all message data from IndexedDB
        backup.data = await indexedDBService.exportAllMessages();

        // Create a downloadable file
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `messenger_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        showSuccess("Messages backed up successfully");
        
        // Refresh storage usage
        await loadStorageUsage();
    } catch (error: any) {
        const errorMsg = error.message || "Failed to backup messages";
        showError(errorMsg);
    } finally {
        isDownloadingMessages.value = false;
    }
}

// Restore messages from a backup file
async function restoreMessages(event: Event) {
    console.log('Restore messages event triggered', event);
    if (isDownloadingMessages.value) {
        console.log('Already processing, ignoring');
        return;
    }

    const fileInput = event.target as HTMLInputElement;
    console.log('File input element:', fileInput);
    if (!fileInput.files || fileInput.files.length === 0) {
        console.log('No files selected');
        return;
    }
    console.log('File selected:', fileInput.files[0].name);

    isDownloadingMessages.value = true;

    try {
        const file = fileInput.files[0];
        const text = await file.text();
        const backup = JSON.parse(text);

        // Validate backup format
        if (!backup.version || !backup.data) {
            throw new Error("Invalid backup file format");
        }

        let restoredCount = 0;
        
        if (backup.version === 1) {
            // Handle old backup format (localStorage)
            // Convert and import to IndexedDB
            const convertedData: Record<string, any> = {};
            
            for (const [key, value] of Object.entries(backup.data)) {
                if (key.startsWith('messages_')) {
                    convertedData[key] = value;
                }
            }
            
            restoredCount = await indexedDBService.importMessages(convertedData);
        } else {
            // Handle new backup format (directly from IndexedDB)
            restoredCount = await indexedDBService.importMessages(backup.data);
        }

        const successMsg = `Successfully restored backup with ${restoredCount} conversation(s)`;
        showSuccess(successMsg);

        // Reset the file input
        fileInput.value = '';
        
        // Refresh storage usage
        await loadStorageUsage();
    } catch (error: any) {
        const errorMsg = error.message || "Failed to restore backup";
        showError(errorMsg);
    } finally {
        isDownloadingMessages.value = false;
    }
}

// Clear all locally stored messages
async function clearLocalMessages() {
    if (isDeletingMessages.value) return;

    isDeletingMessages.value = true;
    showClearMessagesConfirmation.value = false;

    try {
        // Use our deleteAllMessages method from the MessageStore
        await messageStore.deleteAllMessages();

        showSuccess("All local messages deleted successfully");
        
        // Refresh storage usage
        await loadStorageUsage();
    } catch (error: any) {
        const errorMsg = error.message || "Failed to delete messages";
        showError(errorMsg);
    } finally {
        isDeletingMessages.value = false;
    }
}

// Load storage usage data on component mount
onMounted(async () => {
    await loadStorageUsage();
});
</script>

<template>
    <div>
        <!-- Clear Messages Confirmation Dialog -->
        <ConfirmDialog v-model:show="showClearMessagesConfirmation" title="Clear Messages"
            message="Are you sure you want to delete all locally stored messages? This action cannot be undone."
            confirmLabel="Delete Messages" confirmVariant="destructive" @confirm="clearLocalMessages" />

        <!-- Main content -->
        <div class="bg-card rounded-xl shadow-lg">
            <!-- Error/Success Messages are now handled by the toast system -->

            <div class="p-6">
                <div class="flex items-center gap-3 mb-6">
                    <div class="bg-gradient-to-r from-blue-500 to-cyan-400 p-2 rounded-lg">
                        <Database class="h-6 w-6 text-white" />
                    </div>
                    <h2 class="text-2xl font-semibold">Message Storage</h2>
                </div>

                <div class="space-y-8">
                    <!-- Message Storage Info -->
                    <div class="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-blue-500/20 p-4 rounded-lg overflow-hidden relative">
                        <div class="flex items-start gap-4">
                            <ShieldCheck class="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                            <div>
                                <p class="font-medium text-blue-800 dark:text-blue-300">End-to-End Encrypted Messages</p>
                                <p class="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                    Messages are encrypted end-to-end and stored on your device. Messages are only kept on
                                    the server until they are delivered to your contact.
                                </p>
                            </div>
                        </div>
                        <div class="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-blue-500/10"></div>
                        <div class="absolute -bottom-6 -right-10 h-24 w-24 rounded-full bg-blue-400/5"></div>
                    </div>
                    
                    <!-- Storage Usage Display -->
                    <div class="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 rounded-xl border p-5 shadow-inner">
                        <div class="flex items-center justify-between mb-5">
                            <div class="flex items-center gap-3">
                                <div class="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg">
                                    <HardDrive class="h-5 w-5 text-white" />
                                </div>
                                <h3 class="text-lg font-medium">Storage Usage</h3>
                            </div>
                            <button 
                                @click="loadStorageUsage" 
                                class="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 p-1 px-2 rounded-md transition-colors">
                                <RefreshCw class="h-3.5 w-3.5" />
                                <span>Refresh</span>
                            </button>
                        </div>
                        
                        <div class="flex items-center justify-between px-3 py-3 mb-5 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                            <div class="font-medium flex items-center gap-2">
                                <span>Total Storage Used:</span>
                            </div>
                            <div v-if="isLoadingStorageData" class="text-sm text-muted-foreground">Loading...</div>
                            <div v-else class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ formatBytes(totalStorageUsage) }}</div>
                        </div>
                        
                        <div v-if="isLoadingStorageData" class="flex justify-center py-8">
                            <div class="animate-spin rounded-full h-8 w-8 border-3 border-teal-500 border-t-transparent"></div>
                        </div>
                        
                        <div v-else-if="storageUsageByContact.length === 0" class="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Database class="h-12 w-12 text-slate-300 dark:text-slate-600 mb-2" />
                            <span>No message storage data available</span>
                        </div>
                        
                        <div v-else class="space-y-5">
                            <h4 class="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <User class="h-4 w-4" />
                                <span>Storage by Contact</span>
                            </h4>
                            
                            <div class="space-y-4">
                                <div v-for="contact in storageUsageByContact" :key="contact.contactId" 
                                    class="bg-white dark:bg-slate-800/80 rounded-lg p-3 shadow-sm">
                                    <div class="flex items-center justify-between text-sm mb-2">
                                        <div class="font-medium truncate max-w-[60%] flex items-center gap-2">
                                            <div class="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                {{ contact.displayName.charAt(0).toUpperCase() }}
                                            </div>
                                            <span>{{ contact.displayName }}</span>
                                        </div>
                                        <div class="font-mono text-slate-500 dark:text-slate-400 text-xs">
                                            {{ formatBytes(contact.bytesUsed) }} ({{ contact.percentage.toFixed(1) }}%)
                                        </div>
                                    </div>
                                    
                                    <!-- Bar chart -->
                                    <div class="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" 
                                            :style="{ width: `${contact.percentage}%` }"></div>
                                    </div>
                                    
                                    <div class="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                                        <Database class="h-3 w-3" />
                                        <span>{{ contact.messagesCount }} messages</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Message Backup Button -->
                        <div class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-green-200 dark:border-green-800/30 p-4 shadow-sm">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
                                    <Save class="h-5 w-5 text-white" />
                                </div>
                                <div class="font-medium text-green-800 dark:text-emerald-200">Backup Messages</div>
                            </div>
                            <p class="text-sm text-green-700 dark:text-emerald-300/70 mb-4">
                                Export all your messages as a backup file that you can restore later.
                            </p>
                            <Button class="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white" 
                                @click="backupMessages" 
                                :disabled="isDownloadingMessages">
                                <Save class="h-4 w-4 mr-2" v-if="!isDownloadingMessages" />
                                <span v-if="isDownloadingMessages">Backing up...</span>
                                <span v-else>Backup Messages</span>
                            </Button>
                        </div>

                        <!-- Restore Messages Button -->
                        <div class="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30 p-4 shadow-sm">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="bg-gradient-to-br from-blue-500 to-sky-600 p-2 rounded-lg">
                                    <UploadCloud class="h-5 w-5 text-white" />
                                </div>
                                <div class="font-medium text-blue-800 dark:text-blue-200">Restore Messages</div>
                            </div>
                            <p class="text-sm text-blue-700 dark:text-blue-300/70 mb-4">
                                Import messages from a previous backup.
                            </p>
                            <label class="cursor-pointer block w-full">
                                <input type="file" accept=".json" class="hidden" @change="restoreMessages"
                                    :disabled="isDownloadingMessages" ref="fileInputRef" />
                                <Button class="w-full bg-gradient-to-r from-blue-500 to-sky-600 hover:from-blue-600 hover:to-sky-700 text-white" 
                                    type="button" 
                                    :disabled="isDownloadingMessages"
                                    @click="openFileDialog">
                                    <UploadCloud class="h-4 w-4 mr-2" />
                                    Restore Backup
                                </Button>
                            </label>
                        </div>

                        <!-- Delete All Messages -->
                        <div class="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl border border-red-200 dark:border-red-800/30 p-4 shadow-sm">
                            <div class="flex items-center gap-3 mb-2">
                                <div class="bg-gradient-to-br from-red-500 to-rose-600 p-2 rounded-lg">
                                    <Trash2 class="h-5 w-5 text-white" />
                                </div>
                                <div class="font-medium text-red-800 dark:text-red-200">Delete Message History</div>
                            </div>
                            <p class="text-sm text-red-700 dark:text-red-300/70 mb-4">
                                Permanently delete all message history from this device. This cannot be undone.
                            </p>
                            <Button variant="destructive" 
                                class="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                                @click="openClearMessagesConfirmation"
                                :disabled="isDeletingMessages">
                                <Trash2 class="h-4 w-4 mr-2" v-if="!isDeletingMessages" />
                                <span v-if="isDeletingMessages">Deleting...</span>
                                <span v-else>Delete All Messages</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.bg-green-500 {
    background-color: #43B581; /* Discord green */
}

/* Remove extra margins to prevent unexpected spacing */
.max-w-3xl {
    margin-top: 0;
}

/* Animation for loading spinner */
@keyframes spin {
    to { transform: rotate(360deg); }
}
.animate-spin {
    animation: spin 1s linear infinite;
}

/* Border for spinner */
.border-3 {
    border-width: 3px;
}

/* Custom gradients for cards */
.from-indigo-500\/10 {
    --tw-gradient-from: rgb(99 102 241 / 0.1);
}

.to-blue-500\/10 {
    --tw-gradient-to: rgb(59 130 246 / 0.1);
}

/* Card hover effects */
.shadow-sm {
    transition: all 0.2s ease;
}

.shadow-sm:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>
