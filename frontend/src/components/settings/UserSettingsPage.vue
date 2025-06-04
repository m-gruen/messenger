<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { storageService } from '@/services/storage.service';
import { apiService } from '@/services/api.service';
import { useRouter } from 'vue-router';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useMessageStore } from '@/stores/MessageStore';

const router = useRouter();
const user = ref(storageService.getUser());
const token = storageService.getToken()!;
const UserId = storageService.getUser()!.uid;
const messageStore = useMessageStore();

// Form fields
const username = ref(user.value?.username || '');
const DisplayName = ref(user.value?.display_name || '');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

// UI state
const isUpdating = ref(false);
const isDeleting = ref(false);
const updateError = ref<string | null>(null);
const updateSuccess = ref<string | null>(null);
const isEditingUsername = ref(false);
const isEditingDisplayName = ref(false);
const showPasswordModal = ref(false);
const showDeleteConfirmation = ref(false);
const showClearMessagesConfirmation = ref(false);
const isDownloadingMessages = ref(false);
const isDeletingMessages = ref(false);

// Track original values to detect changes
const originalValues = ref({
    username: user.value?.username || '',
    displayName: user.value?.display_name || '',
});

// Calculate if there are unsaved changes
const hasUnsavedChanges = computed(() => {
    return username.value !== originalValues.value.username ||
        DisplayName.value !== originalValues.value.displayName;
});

// Get the profile initial (first letter of username or display name)
const userInitial = computed(() => {
    if (DisplayName.value && DisplayName.value.length > 0) {
        return DisplayName.value[0].toUpperCase();
    }
    if (username.value && username.value.length > 0) {
        return username.value[0].toUpperCase();
    }
    return '?';
});

// Generate a background color based on username for avatar
const avatarBackground = computed(() => {
    const colors = [
        '#7289DA', // blue
        '#43B581', // green
        '#FAA61A', // yellow
        '#F04747', // red
        '#593695', // purple
    ];

    if (!username.value) return colors[0];

    // Simple hash function to get consistent color for a username
    let hash = 0;
    for (let i = 0; i < username.value.length; i++) {
        hash = username.value.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
});

function resetForm() {
    username.value = originalValues.value.username;
    DisplayName.value = originalValues.value.displayName;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    updateError.value = null;
    updateSuccess.value = null;
    isEditingUsername.value = false;
    isEditingDisplayName.value = false;
    showPasswordModal.value = false;
}

// Update when user data changes
watch(user, (newUser) => {
    if (newUser) {
        username.value = newUser.username || '';
        DisplayName.value = newUser.display_name || '';

        originalValues.value = {
            username: newUser.username || '',
            displayName: newUser.display_name || '',
        };
    }
}, { deep: true });

async function updateProfile(): Promise<void> {
    try {
        isUpdating.value = true;
        updateError.value = null;
        updateSuccess.value = null;

        // Handle other profile updates
        if (hasProfileChanges()) {
            const userData: any = {};

            if (username.value && username.value !== user.value?.username) {
                userData.username = username.value;
            }

            if (DisplayName.value !== user.value?.display_name) {
                userData.displayName = DisplayName.value;
            }

            try {
                const response = await apiService.updateUser(UserId, userData, token);

                // Ensure we preserve the original token when updating storage
                const updatedUser = {
                    ...response,
                    token: token // Make sure token is included in the user object
                };

                // Update both in-memory user reference and storage
                storageService.storeUser(updatedUser);
                user.value = updatedUser;

                // Update original values
                originalValues.value = {
                    username: updatedUser.username || '',
                    displayName: updatedUser.display_name || '',
                };

                updateSuccess.value = "Profile updated successfully";
            } catch (error: any) {
                updateError.value = error.message || "Failed to update profile";
                isUpdating.value = false;
                return;
            }
        } else if (!updateSuccess.value) {
            updateSuccess.value = "No changes to update";
        }

        isUpdating.value = false;
        isEditingUsername.value = false;
        isEditingDisplayName.value = false;
    } catch (error: any) {
        updateError.value = error.message || "An unexpected error occurred";
        isUpdating.value = false;
    }
}

async function updatePassword(): Promise<void> {
    try {
        if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
            updateError.value = "All password fields are required";
            return;
        }

        if (newPassword.value !== confirmPassword.value) {
            updateError.value = "New passwords don't match";
            return;
        }

        isUpdating.value = true;
        updateError.value = null;

        try {
            const passwordResponse = await apiService.updatePassword(
                UserId,
                currentPassword.value,
                newPassword.value,
                token
            );

            // Update user data and token after password change
            storageService.storeUser(passwordResponse);
            user.value = passwordResponse;

            // Clear password fields
            currentPassword.value = '';
            newPassword.value = '';
            confirmPassword.value = '';

            updateSuccess.value = "Password updated successfully";
            showPasswordModal.value = false;
        } catch (error: any) {
            updateError.value = error.message || "Failed to update password. Current password may be incorrect.";
        } finally {
            isUpdating.value = false;
        }
    } catch (error: any) {
        updateError.value = error.message || "An unexpected error occurred";
        isUpdating.value = false;
    }
}

async function deleteUserAccount(): Promise<void> {
    try {
        isDeleting.value = true;
        updateError.value = null;
        showDeleteConfirmation.value = false;

        try {
            await apiService.deleteUser(UserId, token);
            
            updateSuccess.value = "Account deleted successfully. Redirecting...";
            
            // Use setTimeout to allow the user to see the success message
            setTimeout(() => {
                // Delete all local messages
                messageStore.deleteAllMessages();
                
                // Clear authentication data
                storageService.clearAllUserData();
                
                // Redirect to login page
                router.push({ name: 'login' });
            }, 1500);
        } catch (error: any) {
            updateError.value = error.message || "Failed to delete account";
            isDeleting.value = false;
        }
    } catch (error: any) {
        updateError.value = error.message || "An unexpected error occurred";
        isDeleting.value = false;
    }
}

// Helper function to check if there are profile changes to update
function hasProfileChanges(): boolean {
    return (
        (username.value && username.value !== originalValues.value.username) ||
        DisplayName.value !== originalValues.value.displayName
    );
}

function openPasswordModal() {
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    showPasswordModal.value = true;
}

function closePasswordModal() {
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    showPasswordModal.value = false;
}

function openDeleteConfirmation() {
    showDeleteConfirmation.value = true;
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
            version: 1,
            userId: UserId,
            timestamp: new Date().toISOString(),
            data: {} as Record<string, any>
        };
        
        // Find all message storage keys in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('messages_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    backup.data[key] = data;
                } catch (e) {
                    console.error(`Failed to parse data for key ${key}`, e);
                }
            }
        }
        
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
        
        // Restore data to localStorage
        let restoredCount = 0;
        for (const [key, value] of Object.entries(backup.data)) {
            localStorage.setItem(key, JSON.stringify(value));
            restoredCount++;
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
        messageStore.deleteAllMessages();
        
        updateSuccess.value = "All local messages deleted successfully";
    } catch (error: any) {
        updateError.value = error.message || "Failed to delete messages";
    } finally {
        isDeletingMessages.value = false;
    }
}

// Add this after the other refs at the top of your script
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
</script>

<template>
    <div>
        <!-- Password Update Modal -->
        <div v-if="showPasswordModal"
            class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div class="bg-card rounded-lg max-w-md w-full relative border border-border shadow-xl">
                <!-- Close button -->
                <button @click="closePasswordModal" class="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                    aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="h-5 w-5">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                    </svg>
                </button>
                
                <div class="p-6">
                    <h2 class="text-xl font-bold text-center">Update your password</h2>
                    <p class="text-muted-foreground text-center mb-6">Enter your current password and a new password.
                    </p>

                    <!-- Error message -->
                    <div v-if="updateError" class="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm border-l-4 border-destructive">
                        {{ updateError }}
                    </div>

                    <form @submit.prevent="updatePassword" class="space-y-4">
                        <div>
                            <label for="current-password-modal" class="block text-sm font-medium mb-1">Current
                                Password</label>
                            <Input id="current-password-modal" v-model="currentPassword" type="password" placeholder=""
                                class="w-full" />
                        </div>

                        <div>
                            <label for="new-password-modal" class="block text-sm font-medium mb-1">New Password</label>
                            <Input id="new-password-modal" v-model="newPassword" type="password" placeholder=""
                                class="w-full" />
                        </div>

                        <div>
                            <label for="confirm-password-modal" class="block text-sm font-medium mb-1">Confirm New
                                Password</label>
                            <Input id="confirm-password-modal" v-model="confirmPassword" type="password" placeholder=""
                                class="w-full" />
                        </div>

                        <div class="flex justify-end gap-3 mt-6">
                            <Button variant="outline" @click="closePasswordModal" type="button">
                                Cancel
                            </Button>
                            <Button variant="default" :disabled="isUpdating" type="submit">
                                <span v-if="isUpdating">Updating...</span>
                                <span v-else>Update Password</span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Dialog -->
        <ConfirmDialog
            v-model:show="showDeleteConfirmation"
            title="Delete Account"
            message="Are you sure you want to delete your account? This action cannot be undone."
            confirmLabel="Delete Account"
            confirmVariant="destructive"
            @confirm="deleteUserAccount"
        />
        
        <!-- Clear Messages Confirmation Dialog -->
        <ConfirmDialog
            v-model:show="showClearMessagesConfirmation"
            title="Clear Messages"
            message="Are you sure you want to delete all locally stored messages? This action cannot be undone."
            confirmLabel="Delete Messages"
            confirmVariant="destructive"
            @confirm="clearLocalMessages"
        />

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

            <!-- User Profile Header -->
            <div class="bg-indigo-600 dark:bg-indigo-800 rounded-t-lg p-6">
                <div class="flex items-center gap-5">
                    <!-- User avatar -->
                    <div class="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                        :style="{ backgroundColor: avatarBackground }">
                        {{ userInitial }}
                    </div>

                    <!-- User info -->
                    <div class="flex-1">
                        <h1 class="text-2xl font-bold text-white">{{ DisplayName || username }}</h1>
                        <p class="text-indigo-200">@{{ username }}</p>
                    </div>
                </div>
            </div>

            <!-- User Account Section -->
            <div class="p-6 border-b dark:border-gray-700">
                <h2 class="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">MY ACCOUNT</h2>

                <div class="space-y-6">
                    <!-- Username -->
                    <div>
                        <div class="flex justify-between items-center">
                            <div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">Username</div>
                                <div class="text-gray-800 dark:text-gray-200">{{ username }}</div>
                            </div>
                            <Button variant="ghost" size="sm" @click="isEditingUsername = !isEditingUsername">
                                Edit
                            </Button>
                        </div>

                        <!-- Inline username edit -->
                        <div v-if="isEditingUsername" class="mt-3">
                            <Input v-model="username" placeholder="Username" class="w-full border-2
                            border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700" />
                        </div>
                    </div>

                    <!-- Display Name -->
                    <div>
                        <div class="flex justify-between items-center">
                            <div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">Display Name</div>
                                <div class="text-gray-800 dark:text-gray-200">{{ DisplayName || "Not set" }}</div>
                            </div>
                            <Button variant="ghost" size="sm" @click="isEditingDisplayName = !isEditingDisplayName">
                                Edit
                            </Button>
                        </div>

                        <!-- Inline display name edit -->
                        <div v-if="isEditingDisplayName" class="mt-3">
                            <Input v-model="DisplayName" placeholder="Display Name" class="w-full border-2
                            border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700" />
                        </div>
                    </div>

                    <!-- Password -->
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">Password</div>
                            <div class="text-gray-800 dark:text-gray-200">••••••••••••</div>
                        </div>
                        <Button variant="ghost" size="sm" @click="openPasswordModal">
                            Change Password
                        </Button>
                    </div>
                </div>
                
                <!-- Delete account section -->
                <div class="mt-6">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="font-medium text-gray-800 dark:text-gray-200">Delete Account</div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                Permanently delete your account. This action cannot be undone.
                            </p>
                        </div>
                        <Button 
                            variant="destructive" 
                            @click="openDeleteConfirmation" 
                            :disabled="isDeleting"
                        >
                            <span v-if="isDeleting">Deleting...</span>
                            <span v-else>Delete Account</span>
                        </Button>
                    </div>
                </div>

                <!-- Message Storage Management Section -->
                <div class="mt-8 pt-6 border-t border-border">
                    <h2 class="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">MESSAGE STORAGE</h2>
                    
                    <div class="space-y-6">
                        <!-- Message Storage Info -->
                        <div class="bg-blue-50 dark:bg-blue-900/20 p-3 text-sm rounded-md text-blue-800 dark:text-blue-300">
                            <p class="mb-1 font-medium">End-to-End Encrypted Messages</p>
                            <p>Messages are encrypted end-to-end and stored on your device. Messages are only kept on the server until they are delivered to your contact.</p>
                        </div>

                        <!-- Message Backup Button -->
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="font-medium text-gray-800 dark:text-gray-200">Backup Messages</div>
                                <p class="text-sm text-gray-500 dark:text-gray-400">
                                    Export all your messages as a backup file that you can restore later.
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                @click="backupMessages" 
                                :disabled="isDownloadingMessages"
                            >
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
                                <input
                                    type="file"
                                    accept=".json"
                                    class="hidden"
                                    @change="restoreMessages"
                                    :disabled="isDownloadingMessages"
                                    ref="fileInputRef"
                                />
                                <Button 
                                    variant="outline" 
                                    type="button"
                                    :disabled="isDownloadingMessages"
                                    @click="openFileDialog"
                                >
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
                            <Button 
                                variant="destructive" 
                                @click="openClearMessagesConfirmation" 
                                :disabled="isDeletingMessages"
                            >
                                <span v-if="isDeletingMessages">Deleting...</span>
                                <span v-else>Delete All</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Save changes button -->
            <div class="p-6 border-t border-border">
                <Button variant="default" @click="updateProfile" :disabled="isUpdating || !hasUnsavedChanges">
                    <span v-if="isUpdating">Saving...</span>
                    <span v-else>Save Changes</span>
                </Button>
                <Button v-if="hasUnsavedChanges" variant="ghost" @click="resetForm" class="ml-2">
                    Reset
                </Button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.bg-green-500 {
  background-color: #43B581;
  /* Discord green */
}

/* Switch animation */
.transform {
  transition: transform 150ms ease-in-out;
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
</style>
