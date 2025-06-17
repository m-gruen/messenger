<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { storageService } from '@/services/storage.service';
import { indexedDBService } from '@/services/indexeddb.service';
import { useMessageStore } from '@/stores/MessageStore';
import ConfirmDialog from '@/components/ConfirmDialog.vue';

const UserId = storageService.getUser()!.uid;
const messageStore = useMessageStore();

// UI state
const updateError = ref<string | null>(null);
const updateSuccess = ref<string | null>(null);
const showClearMessagesConfirmation = ref(false);
const isDownloadingMessages = ref(false);
const isDeletingMessages = ref(false);

// Add this for the file input reference
const fileInputRef = ref<HTMLInputElement | null>(null);

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
    } catch (error: any) {
        updateError.value = error.message || "Failed to delete messages";
    } finally {
        isDeletingMessages.value = false;
    }
}
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
</style>
