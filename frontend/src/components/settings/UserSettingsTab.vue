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

const router = useRouter();
const user = ref(storageService.getUser());
const token = storageService.getToken()!;
const UserId = storageService.getUser()!.uid;
const messageStore = useMessageStore();
const { showToast, showError, showSuccess, showInfo } = useToast();

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
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showError('Image size should not exceed 5MB');
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
            class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div class="bg-card rounded-lg max-w-md w-full relative border border-border shadow-xl">
                <!-- Close button -->
                <button @click="closePasswordModal"
                    class="absolute top-4 right-4 text-muted-foreground hover:text-foreground" aria-label="Close">
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

                    <!-- Error messages are now handled by the toast system -->

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
        <ConfirmDialog v-model:show="showDeleteConfirmation" title="Delete Account"
            message="Are you sure you want to delete your account? This action cannot be undone."
            confirmLabel="Delete Account" confirmVariant="destructive" @confirm="deleteUserAccount" />

        <!-- Main content -->
        <div class="bg-card rounded-lg shadow-md">

            <!-- User Profile Header -->
            <div class="bg-indigo-600 dark:bg-indigo-800 rounded-t-lg p-6">
                <div class="flex items-center gap-5">
                    <!-- User avatar or profile picture -->
                    <div class="relative h-20 w-20">
                        <template v-if="profilePicturePreview || profilePicture">
                            <img :src="profilePicturePreview || (profilePicture ? 'data:image/jpeg;base64,' + profilePicture : undefined)"
                                class="h-20 w-20 rounded-full object-cover border-4 border-white shadow"
                                alt="Profile Picture" />
                            <button @click="removeProfilePicture"
                                class="absolute top-0 right-0 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                                title="Remove picture">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
                                    viewBox="0 0 24 24">
                                    <path stroke="currentColor" stroke-width="2" d="M18 6 6 18m0-12 12 12" />
                                </svg>
                            </button>
                        </template>
                        <template v-else>
                            <div class="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                                :style="{ backgroundColor: avatarBackground }">
                                {{ userInitial }}
                            </div>
                        </template>
                        <!-- Upload button -->
                        <button @click="openPictureDialog"
                            class="absolute bottom-0 right-0 bg-indigo-700 text-white rounded-full p-1.5 hover:bg-indigo-800 border-2 border-white shadow"
                            title="Change picture">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
                                viewBox="0 0 24 24">
                                <path stroke="currentColor" stroke-width="2"
                                    d="M12 16v-4m0 0V8m0 4h4m-4 0H8m12 4v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" />
                            </svg>
                        </button>
                        <input ref="pictureInputRef" type="file" accept="image/*" class="hidden"
                            @change="handlePictureChange" />
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
                        <Button variant="destructive" @click="openDeleteConfirmation" :disabled="isDeleting">
                            <span v-if="isDeleting">Deleting...</span>
                            <span v-else>Delete Account</span>
                        </Button>
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
