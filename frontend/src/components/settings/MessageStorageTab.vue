<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { storageService } from '@/services/storage.service';
import { indexedDBService } from '@/services/indexeddb.service';
import { useMessageStore } from '@/stores/MessageStore';
import { useContactStore } from '@/stores/ContactStore';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

const UserId = storageService.getUser()!.uid;
const messageStore = useMessageStore();
const contactStore = useContactStore();

// UI state
const updateError = ref<string | null>(null);
const updateSuccess = ref<string | null>(null);
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
    updateError.value = null;

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

        updateSuccess.value = "Messages backed up successfully";
        
        // Refresh storage usage
        await loadStorageUsage();
    } catch (error: any) {
        updateError.value = error.message || "Failed to backup messages";
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
    updateError.value = null;

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

        updateSuccess.value = `Successfully restored backup with ${restoredCount} conversation(s)`;

        // Reset the file input
        fileInput.value = '';
        
        // Refresh storage usage
        await loadStorageUsage();
    } catch (error: any) {
        updateError.value = error.message || "Failed to restore backup";
    } finally {
        isDownloadingMessages.value = false;
    }
}

// Clear all locally stored messages
async function clearLocalMessages() {
    if (isDeletingMessages.value) return;

    isDeletingMessages.value = true;
    updateError.value = null;
    showClearMessagesConfirmation.value = false;

    try {
        // Use our deleteAllMessages method from the MessageStore
        await messageStore.deleteAllMessages();

        updateSuccess.value = "All local messages deleted successfully";
        
        // Refresh storage usage
        await loadStorageUsage();
    } catch (error: any) {
        updateError.value = error.message || "Failed to delete messages";
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
        <div class="bg-card rounded-lg shadow-md">
            <!-- Error/Success Messages -->
            <div v-if="updateError" class="p-4 bg-destructive/10 text-destructive border-l-4 border-destructive">
                {{ updateError }}
            </div>
            <div v-if="updateSuccess"
                class="p-4 bg-green-100 dark:bg-green-900/10 text-green-800 dark:text-green-400 border-l-4 border-green-500">
                {{ updateSuccess }}
            </div>

            <div class="p-6">
                <h2 class="text-xl font-medium mb-4">MESSAGE STORAGE</h2>

                <div class="space-y-6">
                    <!-- Message Storage Info -->
                    <div
                        class="bg-blue-50 dark:bg-blue-900/20 p-3 text-sm rounded-md text-blue-800 dark:text-blue-300">
                        <p class="mb-1 font-medium">End-to-End Encrypted Messages</p>
                        <p>Messages are encrypted end-to-end and stored on your device. Messages are only kept on
                            the server until they are delivered to your contact.</p>
                    </div>
                    
                    <!-- Storage Usage Display -->
                    <div class="bg-card/50 rounded-lg border p-4 mb-4">
                        <h3 class="text-lg font-medium mb-2">Storage Usage</h3>
                        
                        <div class="flex items-center justify-between mb-4">
                            <div class="font-medium">Total Storage Used:</div>
                            <div v-if="isLoadingStorageData" class="text-sm text-muted-foreground">Loading...</div>
                            <div v-else class="text-lg font-bold">{{ formatBytes(totalStorageUsage) }}</div>
                        </div>
                        
                        <div v-if="isLoadingStorageData" class="flex justify-center py-8">
                            <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary"></div>
                        </div>
                        
                        <div v-else-if="storageUsageByContact.length === 0" class="text-center py-4 text-muted-foreground">
                            No message storage data available
                        </div>
                        
                        <div v-else class="space-y-4">
                            <h4 class="text-sm font-medium text-muted-foreground mb-2">Storage by Contact</h4>
                            
                            <div v-for="contact in storageUsageByContact" :key="contact.contactId" class="mb-3">
                                <div class="flex items-center justify-between text-sm mb-1">
                                    <div class="font-medium truncate max-w-[60%]">
                                        {{ contact.displayName }}
                                    </div>
                                    <div class="text-muted-foreground text-xs">
                                        {{ formatBytes(contact.bytesUsed) }} ({{ contact.percentage.toFixed(1) }}%)
                                    </div>
                                </div>
                                
                                <!-- Bar chart -->
                                <div class="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                                    <div class="h-full bg-primary" 
                                         :style="{ width: `${contact.percentage}%` }"></div>
                                </div>
                                
                                <div class="text-xs text-muted-foreground mt-1">
                                    {{ contact.messagesCount }} messages
                                </div>
                            </div>
                            
                            <div class="text-xs text-right mt-2 text-muted-foreground">
                                <button @click="loadStorageUsage" class="underline">Refresh</button>
                            </div>
                        </div>
                    </div>

                    <!-- Message Backup Button -->
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="font-medium text-gray-800 dark:text-gray-200">Backup Messages</div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                Export all your messages as a backup file that you can restore later.
                            </p>
                        </div>
                        <Button variant="outline" @click="backupMessages" :disabled="isDownloadingMessages">
                            <span v-if="isDownloadingMessages">Backing up...</span>
                            <span v-else>Backup</span>
                        </Button>
                    </div>

                    <!-- Restore Messages Button -->
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="font-medium text-gray-800 dark:text-gray-200">Restore Messages</div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                Import messages from a previous backup.
                            </p>
                        </div>
                        <label class="cursor-pointer">
                            <input type="file" accept=".json" class="hidden" @change="restoreMessages"
                                :disabled="isDownloadingMessages" ref="fileInputRef" />
                            <Button variant="outline" type="button" :disabled="isDownloadingMessages"
                                @click="openFileDialog">
                                Restore
                            </Button>
                        </label>
                    </div>

                    <!-- Delete All Messages -->
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="font-medium text-gray-800 dark:text-gray-200">Delete Message History</div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                Permanently delete all message history from this device. This cannot be undone.
                            </p>
                        </div>
                        <Button variant="destructive" @click="openClearMessagesConfirmation"
                            :disabled="isDeletingMessages">
                            <span v-if="isDeletingMessages">Deleting...</span>
                            <span v-else>Delete All</span>
                        </Button>
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
</style>
