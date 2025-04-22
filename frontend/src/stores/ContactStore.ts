import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiService } from '@/services/api.service';
import type { Contact } from '@/models/contact-model';
import { ContactStatus } from '@/models/contact-model';
import { useAuthStore } from './AuthStore';

export const useContactStore = defineStore('contacts', () => {
    // State
    const contacts = ref<Contact[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const pendingOperations = ref<{ [key: number]: { [action: string]: boolean } }>({});

    // Auth store for user info
    const authStore = useAuthStore();
    const currentUserId = computed(() => authStore.user?.uid || 0);
    const token = computed(() => authStore.user?.token || '');

    // Computed properties
    const acceptedContacts = computed(() => contacts.value.filter(c => c.status === ContactStatus.ACCEPTED));
    const incomingRequests = computed(() => contacts.value.filter(c => c.status === ContactStatus.INCOMING_REQUEST));
    const outgoingRequests = computed(() => contacts.value.filter(c => c.status === ContactStatus.OUTGOING_REQUEST));

    // Actions
    async function fetchAllContacts() {
        if (!currentUserId.value) return;

        loading.value = true;
        error.value = null;

        try {
            contacts.value = await apiService.getContacts(currentUserId.value, token.value);
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to fetch contacts';
            console.error('Error fetching contacts:', err);
        } finally {
            loading.value = false;
        }
    }

    function getContactStatus(contactUserId: number): ContactStatus | null {
        const contact = contacts.value.find(c => c.contactUserId === contactUserId);
        return contact ? contact.status : null;
    }

    function isExistingContact(contactUserId: number): boolean {
        return getContactStatus(contactUserId) !== null;
    }

    async function addContact(contactUserId: number, username: string) {
        if (!currentUserId.value) return;

        setPendingOperation(contactUserId, 'add', true);

        try {
            await apiService.addContact(currentUserId.value, contactUserId, token.value);

            // Add to local state with OUTGOING_REQUEST status
            const newContact: Contact = {
                contactId: 0,  // Placeholder, will be updated on next refresh
                userId: currentUserId.value,
                contactUserId: contactUserId,
                username: username,
                createdAt: new Date(),
                status: ContactStatus.OUTGOING_REQUEST
            };

            contacts.value.push(newContact);
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to add contact';
            console.error('Error adding contact:', err);
            throw err;
        } finally {
            setPendingOperation(contactUserId, 'add', false);
        }
    }

    async function acceptContactRequest(contactUserId: number) {
        if (!currentUserId.value) return;

        setPendingOperation(contactUserId, 'accept', true);

        try {
            await apiService.acceptContactRequest(currentUserId.value, contactUserId, token.value);

            // Update status in local state
            const contactIndex = contacts.value.findIndex(c => c.contactUserId === contactUserId);
            if (contactIndex >= 0) {
                contacts.value[contactIndex].status = ContactStatus.ACCEPTED;
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to accept contact request';
            console.error('Error accepting contact request:', err);
            throw err;
        } finally {
            setPendingOperation(contactUserId, 'accept', false);
        }
    }

    async function rejectContactRequest(contactUserId: number) {
        if (!currentUserId.value) return;

        setPendingOperation(contactUserId, 'reject', true);

        try {
            await apiService.rejectContactRequest(currentUserId.value, contactUserId, token.value);

            // Remove from local state
            contacts.value = contacts.value.filter(c => c.contactUserId !== contactUserId);
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to reject contact request';
            console.error('Error rejecting contact request:', err);
            throw err;
        } finally {
            setPendingOperation(contactUserId, 'reject', false);
        }
    }

    async function cancelOutgoingRequest(contactUserId: number) {
        if (!currentUserId.value) return;

        setPendingOperation(contactUserId, 'cancel', true);

        try {
            await apiService.deleteContact(currentUserId.value, contactUserId, token.value);

            // Remove from local state
            contacts.value = contacts.value.filter(c => c.contactUserId !== contactUserId);
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to cancel request';
            console.error('Error canceling request:', err);
            throw err;
        } finally {
            setPendingOperation(contactUserId, 'cancel', false);
        }
    }

    async function deleteContact(contactUserId: number) {
        if (!currentUserId.value) return;

        setPendingOperation(contactUserId, 'delete', true);

        try {
            await apiService.deleteContact(currentUserId.value, contactUserId, token.value);

            // Remove from local state
            contacts.value = contacts.value.filter(c => c.contactUserId !== contactUserId);
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to delete contact';
            console.error('Error deleting contact:', err);
            throw err;
        } finally {
            setPendingOperation(contactUserId, 'delete', false);
        }
    }

    function setPendingOperation(contactUserId: number, action: string, value: boolean) {
        if (!pendingOperations.value[contactUserId]) {
            pendingOperations.value[contactUserId] = {};
        }
        pendingOperations.value[contactUserId][action] = value;
    }

    function isPending(contactUserId: number, action?: string): boolean {
        if (!pendingOperations.value[contactUserId]) return false;

        if (action) {
            return !!pendingOperations.value[contactUserId][action];
        }

        // Check if any operation is pending for this contact
        return Object.values(pendingOperations.value[contactUserId]).some(value => value);
    }

    // Return the store
    return {
        contacts,
        loading,
        error,
        acceptedContacts,
        incomingRequests,
        outgoingRequests,
        fetchAllContacts,
        getContactStatus,
        isExistingContact,
        addContact,
        acceptContactRequest,
        rejectContactRequest,
        cancelOutgoingRequest,
        deleteContact,
        isPending
    };
});
