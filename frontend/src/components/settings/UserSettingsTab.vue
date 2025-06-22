<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { storageService } from '@/services/storage.service';
import { apiService } from '@/services/api.service';
import { useRouter } from 'vue-router';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useMessageStore } from '@/stores/MessageStore';
import { useToast } from '@/composables/useToast';
import { User, Camera, Pencil, Lock, Trash2, Save, XCircle, Check, Loader2 } from 'lucide-vue-next';

const router = useRouter();
const user = ref(storageService.getUser());
const token = storageService.getToken()!;
const UserId = storageService.getUser()!.uid;
const messageStore = useMessageStore();
const { showError, showSuccess, showInfo } = useToast();

// Form fields
const username = ref(user.value?.username || '');
const DisplayName = ref(user.value?.display_name || '');
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

// UI state
const isUpdating = ref(false);
const isDeleting = ref(false);
const isEditingUsername = ref(false);
const isEditingDisplayName = ref(false);
const showPasswordModal = ref(false);
const showDeleteConfirmation = ref(false);
const profilePicture = ref(user.value?.profile_picture || null);
const profilePicturePreview = ref<string | null>(null);
const isUploadingPicture = ref(false);

// Track original values to detect changes
const originalValues = ref({
    username: user.value?.username || '',
    displayName: user.value?.display_name || '',
});

// --- PATCH: Robust profile picture update and removal logic ---

// Calculate if there are unsaved changes
const hasUnsavedChanges = computed(() => {
    // If a new picture is selected, or the picture was removed, allow save
    const pictureChanged = (
        (profilePicturePreview.value !== null) ||
        (profilePicture.value === null && user.value?.profile_picture)
    );
    return (
        username.value !== originalValues.value.username ||
        DisplayName.value !== originalValues.value.displayName ||
        pictureChanged
    );
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
    isEditingUsername.value = false;
    isEditingDisplayName.value = false;
    showPasswordModal.value = false;
    // Reset picture preview and value to match original user
    profilePicturePreview.value = null;
    profilePicture.value = user.value?.profile_picture || null;
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

// Watch for user changes to update profile picture
watch(user, (newUser) => {
    if (newUser) {
        profilePicture.value = newUser.profile_picture || null;
    }
}, { deep: true });

async function updateProfile(): Promise<void> {
    try {
        isUpdating.value = true;
        const userData: any = {};
        if (username.value && username.value !== user.value?.username) {
            userData.username = username.value;
        }
        if (DisplayName.value !== user.value?.display_name) {
            userData.displayName = DisplayName.value;
        }
        // Handle profile picture update
        if (profilePicturePreview.value !== null) {
            // If preview is set, use it (remove data:... prefix for backend)
            userData.profilePicture = profilePicturePreview.value.split(',')[1];
        } else if (profilePicture.value === null && user.value?.profile_picture) {
            // If removed
            userData.profilePicture = null;
        }
        if (Object.keys(userData).length === 0) {
            showInfo('No changes to update');
            isUpdating.value = false;
            return;
        }
        try {
            const response = await apiService.updateUser(UserId, userData, token);
            const updatedUser = { ...response, token: token };
            storageService.storeUser(updatedUser);
            user.value = updatedUser;
            // Update local state
            profilePicture.value = updatedUser.profile_picture || null;
            profilePicturePreview.value = null; // Always clear preview after save
            originalValues.value = {
                username: updatedUser.username || '',
                displayName: updatedUser.display_name || '',
            };
            showSuccess('Profile updated successfully');
        } catch (error: any) {
            showError(error.message || 'Failed to update profile');
            isUpdating.value = false;
            return;
        }
        isUpdating.value = false;
        isEditingUsername.value = false;
        isEditingDisplayName.value = false;
    } catch (error: any) {
        showError(error.message || 'An unexpected error occurred');
        isUpdating.value = false;
    }
}

async function updatePassword(): Promise<void> {
    try {
        if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
            showError("All password fields are required");
            return;
        }

        if (newPassword.value !== confirmPassword.value) {
            showError("New passwords don't match");
            return;
        }

        isUpdating.value = true;

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

            showSuccess("Password updated successfully");
            showPasswordModal.value = false;
        } catch (error: any) {
            showError(error.message || "Failed to update password. Current password may be incorrect.");
        } finally {
            isUpdating.value = false;
        }
    } catch (error: any) {
        showError(error.message || "An unexpected error occurred");
        isUpdating.value = false;
    }
}

async function deleteUserAccount(): Promise<void> {
    try {
        isDeleting.value = true;
        showDeleteConfirmation.value = false;

        try {
            await apiService.deleteUser(UserId, token);

            showSuccess("Account deleted successfully. Redirecting...");

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
            showError(error.message || "Failed to delete account");
            isDeleting.value = false;
        }
    } catch (error: any) {
        showError(error.message || "An unexpected error occurred");
        isDeleting.value = false;
    }
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

// Add this for the file input reference
const pictureInputRef = ref<HTMLInputElement | null>(null);

function openPictureDialog() {
    if (pictureInputRef.value && !isUploadingPicture.value) {
        pictureInputRef.value.value = '';
        pictureInputRef.value.click();
    }
}

function handlePictureChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        // Reset file input to allow re-selection
        input.value = '';
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showError('Image size should not exceed 5MB');
        // Reset file input to allow re-selection
        input.value = '';
        return;
    }
    isUploadingPicture.value = true;
    compressImage(file)
        .then((dataUrl) => {
            profilePicturePreview.value = dataUrl;
        })
        .catch(() => {
            showError('Failed to process image. Try a smaller image.');
        })
        .finally(() => {
            isUploadingPicture.value = false;
        });
}

function removeProfilePicture() {
    // If a new picture is selected but not saved, just clear the preview
    if (profilePicturePreview.value !== null) {
        profilePicturePreview.value = null;
    }
    // If a picture is set (from backend), mark for removal
    if (profilePicture.value !== null) {
        profilePicture.value = null;
    }
}

// Compress image logic (from MessageInput.vue)
function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 512;
                if (width > MAX_WIDTH) {
                    const ratio = MAX_WIDTH / width;
                    width = MAX_WIDTH;
                    height = height * ratio;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('No canvas context'));
                ctx.drawImage(img, 0, 0, width, height);
                const quality = 0.7;
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}
</script>

<template>
    <div>
        <!-- Password Update Modal -->
        <div v-if="showPasswordModal"
            class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="bg-gradient-to-b from-card to-card/90 rounded-xl max-w-md w-full relative border border-violet-300/20 dark:border-violet-800/30 shadow-xl overflow-hidden">
                <!-- Modal Top Accent -->
                <div class="h-1.5 w-full bg-gradient-to-r from-violet-500 to-purple-600"></div>
                
                <!-- Close button -->
                <button @click="closePasswordModal"
                    class="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" 
                    aria-label="Close">
                    <XCircle class="h-6 w-6" />
                </button>

                <div class="p-8">
                    <div class="flex items-center gap-3 mb-6 justify-center">
                        <div class="bg-gradient-to-r from-violet-500 to-purple-600 p-2.5 rounded-lg shadow-lg">
                            <Lock class="h-6 w-6 text-white" />
                        </div>
                        <h2 class="text-2xl font-bold">Change Password</h2>
                    </div>
                    
                    <p class="text-slate-600 dark:text-slate-400 text-center mb-8">
                        Enter your current password and set a new secure password.
                    </p>

                    <!-- Error messages are now handled by the toast system -->

                    <form @submit.prevent="updatePassword" class="space-y-5">
                        <div>
                            <label for="current-password-modal" class="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                                Current Password
                            </label>
                            <Input 
                                id="current-password-modal" 
                                v-model="currentPassword" 
                                type="password" 
                                placeholder="••••••••••••"
                                class="w-full border-2 border-slate-300 dark:border-slate-700 focus:border-violet-500 focus:ring focus:ring-violet-500/30" 
                            />
                        </div>

                        <div>
                            <label for="new-password-modal" class="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                                New Password
                            </label>
                            <Input 
                                id="new-password-modal" 
                                v-model="newPassword" 
                                type="password" 
                                placeholder="••••••••••••"
                                class="w-full border-2 border-slate-300 dark:border-slate-700 focus:border-violet-500 focus:ring focus:ring-violet-500/30"  
                            />
                        </div>

                        <div>
                            <label for="confirm-password-modal" class="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                                Confirm New Password
                            </label>
                            <Input 
                                id="confirm-password-modal" 
                                v-model="confirmPassword" 
                                type="password" 
                                placeholder="••••••••••••"
                                class="w-full border-2 border-slate-300 dark:border-slate-700 focus:border-violet-500 focus:ring focus:ring-violet-500/30" 
                            />
                        </div>

                        <div class="flex justify-end gap-3 mt-8">
                            <Button 
                                variant="outline" 
                                @click="closePasswordModal" 
                                type="button"
                                class="border-slate-300 dark:border-slate-700">
                                <XCircle class="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button 
                                variant="default" 
                                :disabled="isUpdating" 
                                type="submit"
                                class="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                                <Loader2 class="h-4 w-4 mr-2 animate-spin" v-if="isUpdating" />
                                <Check class="h-4 w-4 mr-2" v-else />
                                <span v-if="isUpdating">Updating...</span>
                                <span v-else>Update Password</span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Dialog -->
        <ConfirmDialog v-model:show="showDeleteConfirmation" title="Delete Account"
            message="Are you sure you want to delete your account? This action cannot be undone."
            confirmLabel="Delete Account" confirmVariant="destructive" @confirm="deleteUserAccount" />

        <!-- Main content -->
        <div class="bg-card rounded-xl shadow-lg overflow-hidden">
            
            <!-- User Profile Header -->
            <div class="relative bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-800 dark:to-blue-800 p-8">
                <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mt-20 -mr-20"></div>
                <div class="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -mb-32 -ml-32"></div>
                
                <div class="relative flex items-start gap-8">
                    <!-- User avatar or profile picture with animation -->
                    <div class="relative">
                        <div class="h-28 w-28 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105">
                            <template v-if="profilePicturePreview || profilePicture">
                                <img :src="profilePicturePreview || (profilePicture ? 'data:image/jpeg;base64,' + profilePicture : undefined)"
                                    class="h-28 w-28 object-cover"
                                    alt="Profile Picture" />
                            </template>
                            <template v-else>
                                <div class="h-28 w-28 flex items-center justify-center text-3xl font-bold text-white"
                                    :style="{ backgroundColor: avatarBackground }">
                                    {{ userInitial }}
                                </div>
                            </template>
                        </div>
                        
                        <!-- Remove button -->
                        <button v-if="profilePicturePreview || profilePicture"
                            @click="removeProfilePicture"
                            class="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 backdrop-blur-sm transition-colors"
                            title="Remove picture">
                            <XCircle class="h-5 w-5" />
                        </button>
                        
                        <!-- Upload button -->
                        <button @click="openPictureDialog"
                            class="absolute -bottom-2 -right-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-full p-2.5 hover:from-indigo-600 hover:to-blue-700 border-2 border-white/90 shadow-lg transition-all duration-200 hover:scale-110"
                            title="Change picture">
                            <Camera class="h-5 w-5" />
                        </button>
                        <input ref="pictureInputRef" type="file" accept="image/*" class="hidden"
                            @change="handlePictureChange" />
                    </div>
                    
                    <!-- User info with animations -->
                    <div class="flex-1 py-3">
                        <div class="flex flex-col gap-1">
                            <h1 class="text-3xl font-bold text-white">{{ DisplayName || username }}</h1>
                            <p class="text-indigo-200 flex items-center gap-1.5">
                                <User class="h-4 w-4" />
                                <span>@{{ username }}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- User Account Section -->
            <div class="p-8">
                <div class="flex items-center gap-3 mb-6">
                    <div class="bg-gradient-to-r from-indigo-500 to-blue-500 p-2 rounded-lg">
                        <User class="h-6 w-6 text-white" />
                    </div>
                    <h2 class="text-2xl font-semibold">Account Settings</h2>
                </div>

                <!-- Settings Cards -->
                <div class="space-y-8">
                    <!-- Account info card -->
                    <div class="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-900/40 rounded-xl border p-5 shadow-sm">
                        <h3 class="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">Profile Information</h3>

                        <div class="space-y-5">
                            <!-- Username -->
                            <div class="bg-white dark:bg-slate-800/80 rounded-lg p-4 shadow-sm">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="text-sm font-medium text-indigo-600 dark:text-indigo-400">Username</div>
                                        <div class="mt-1 font-medium">{{ username }}</div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        class="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300"
                                        @click="isEditingUsername = !isEditingUsername">
                                        <Pencil class="h-4 w-4 mr-1" />
                                        {{ isEditingUsername ? 'Cancel' : 'Edit' }}
                                    </Button>
                                </div>

                                <!-- Inline username edit -->
                                <div v-if="isEditingUsername" class="mt-4">
                                    <Input 
                                        v-model="username" 
                                        placeholder="Username" 
                                        class="w-full border-2 border-indigo-300 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800" 
                                    />
                                </div>
                            </div>

                            <!-- Display Name -->
                            <div class="bg-white dark:bg-slate-800/80 rounded-lg p-4 shadow-sm">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="text-sm font-medium text-blue-600 dark:text-blue-400">Display Name</div>
                                        <div class="mt-1 font-medium">{{ DisplayName || "Not set" }}</div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        class="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300"
                                        @click="isEditingDisplayName = !isEditingDisplayName">
                                        <Pencil class="h-4 w-4 mr-1" />
                                        {{ isEditingDisplayName ? 'Cancel' : 'Edit' }}
                                    </Button>
                                </div>

                                <!-- Inline display name edit -->
                                <div v-if="isEditingDisplayName" class="mt-4">
                                    <Input 
                                        v-model="DisplayName" 
                                        placeholder="Display Name" 
                                        class="w-full border-2 border-blue-300 dark:border-blue-700 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800"
                                    />
                                </div>
                            </div>

                            <!-- Password -->
                            <div class="bg-white dark:bg-slate-800/80 rounded-lg p-4 shadow-sm">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <div class="text-sm font-medium text-violet-600 dark:text-violet-400">Password</div>
                                        <div class="mt-1 font-medium">••••••••••••</div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        class="bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-800/50 text-violet-700 dark:text-violet-300"
                                        @click="openPasswordModal">
                                        <Lock class="h-4 w-4 mr-1" />
                                        Change Password
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Danger Zone Card -->
                    <div class="bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 rounded-xl border border-rose-200 dark:border-rose-800/30 p-5">
                        <h3 class="flex items-center gap-2 text-lg font-semibold mb-4 text-rose-800 dark:text-rose-300">
                            <Trash2 class="h-5 w-5" />
                            Danger Zone
                        </h3>
                        
                        <div class="bg-white/80 dark:bg-slate-900/50 rounded-lg p-5 border border-rose-200 dark:border-rose-800/20">
                            <div class="flex justify-between items-center">
                                <div>
                                    <div class="font-medium text-rose-700 dark:text-rose-400">Delete Account</div>
                                    <p class="text-sm text-rose-600/80 dark:text-rose-400/80 mt-1">
                                        Permanently delete your account. This action cannot be undone.
                                    </p>
                                </div>
                                <Button 
                                    variant="destructive" 
                                    class="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
                                    @click="openDeleteConfirmation" 
                                    :disabled="isDeleting">
                                    <Trash2 class="h-4 w-4 mr-2" v-if="!isDeleting" />
                                    <Loader2 class="h-4 w-4 mr-2 animate-spin" v-else />
                                    <span v-if="isDeleting">Deleting...</span>
                                    <span v-else>Delete Account</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Save changes button -->
            <div class="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/60 dark:to-slate-900/60 border-t">
                <div class="flex items-center justify-between">
                    <div class="text-sm text-slate-600 dark:text-slate-400">
                        <div v-if="hasUnsavedChanges" class="flex items-center gap-1">
                            <div class="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <span>You have unsaved changes</span>
                        </div>
                        <div v-else>&nbsp;</div>
                    </div>
                    <div class="flex gap-3 ml-auto">
                        <Button 
                            v-if="hasUnsavedChanges" 
                            variant="outline" 
                            @click="resetForm" 
                            class="border-slate-300">
                            <XCircle class="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        <Button 
                            variant="default"
                            class="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700"
                            @click="updateProfile" 
                            :disabled="isUpdating || !hasUnsavedChanges">
                            <Loader2 class="h-4 w-4 mr-2 animate-spin" v-if="isUpdating" />
                            <Save class="h-4 w-4 mr-2" v-else />
                            <span v-if="isUpdating">Saving...</span>
                            <span v-else>Save Changes</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.bg-green-500 {
    background-color: #43B581;
    /* Discord green */
}

/* Animations */
.transform {
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
}

.animate-pulse {
    animation: pulse 1.5s ease-in-out infinite;
}

/* Gradients and shadows */
.shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
}

.shadow-sm:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Input field styling */
input,
select {
    border-width: 2px !important;
    transition: all 0.2s ease-in-out !important;
}

.dark input,
.dark select {
    color: white !important;
    background-color: #1F2937 !important;
}

/* Remove extra margins to prevent unexpected spacing */
.max-w-3xl {
    margin-top: 0;
}

/* Backdrop blur for modal */
.backdrop-blur-sm {
    backdrop-filter: blur(4px);
}
</style>
