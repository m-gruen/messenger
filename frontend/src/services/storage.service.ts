import type { AuthenticatedUser } from '@/models/user-model';
import type { IMessage } from '@/models/message-model';
import { indexedDBService } from './indexeddb.service';

export class StorageService {
    /**
     * Store token in localStorage
     * @param token JWT token
     */
    public storeToken(token: string): void {
        localStorage.setItem('token', token);
    }

    // We no longer need the getConversationKey method as it's now handled by the IndexedDBService

    /**
     * Store messages for a specific contact conversation
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @param messages Array of messages to store
     */
    public async storeMessagesForContact(userId: number, contactId: number, messages: IMessage[]): Promise<void> {
        if (messages.length === 0) {
            console.log("No messages to store");
            return;
        }

        try {
            // Use IndexedDB service to store messages
            await indexedDBService.storeMessagesForContact(userId, contactId, messages);
        } catch (e) {
            console.error('Error storing messages for contact:', e);
        }
    }

    /**
     * Add a single message to a contact's conversation history
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @param message Message to add
     */
    public async addMessageToContact(userId: number, contactId: number, message: IMessage): Promise<void> {
        try {
            await indexedDBService.addMessageToContact(userId, contactId, message);
        } catch (e) {
            console.error('Error adding message to contact:', e);
        }
    }

    /**
     * Delete all messages for a specific contact
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns True if successful, false otherwise
     */
    public async deleteMessagesForContact(userId: number, contactId: number): Promise<boolean> {
        try {
            return await indexedDBService.deleteMessagesForContact(userId, contactId);
        } catch (e) {
            console.error('Error deleting messages for contact:', e);
            return false;
        }
    }

    /**
     * Get all messages for a specific contact conversation
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns Array of messages sorted by timestamp (oldest first)
     */
    public async getMessagesForContact(userId: number, contactId: number): Promise<IMessage[]> {
        try {
            return await indexedDBService.getMessagesForContact(userId, contactId);
        } catch (e) {
            console.error('Error retrieving messages for contact:', e);
            return [];
        }
    }

    /**
     * Get the last message for a specific contact conversation
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns The most recent message or null if none found
     */
    public async getLastMessageForContact(userId: number, contactId: number): Promise<IMessage | null> {
        try {
            return await indexedDBService.getLastMessageForContact(userId, contactId);
        } catch (e) {
            console.error('Error getting last message for contact:', e);
            return null;
        }
    }

    /**
     * Delete all messages stored in IndexedDB
     */
    public async deleteAllMessages(): Promise<void> {
        try {
            await indexedDBService.deleteAllMessages();
        } catch (e) {
            console.error('Error deleting all messages:', e);
        }
    }

    /**
     * Check if there are any messages stored for a specific contact
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns Promise resolving to true if messages exist, false otherwise
     */
    public async hasMessagesForContact(userId: number, contactId: number): Promise<boolean> {
        try {
            return await indexedDBService.hasMessagesForContact(userId, contactId);
        } catch (e) {
            console.error('Error checking for messages:', e);
            return false;
        }
    }

    /**
     * Count the number of messages stored for a specific contact
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns Promise resolving to the number of messages
     */
    public async countMessagesForContact(userId: number, contactId: number): Promise<number> {
        try {
            return await indexedDBService.countMessagesForContact(userId, contactId);
        } catch (e) {
            console.error('Error counting messages:', e);
            return 0;
        }
    }

    /**
     * Store user data in localStorage
     * @param user User data to store
     */
    public storeUser(user: AuthenticatedUser): void {
        // If private_key is not provided (e.g. during login), try to retrieve from localStorage
        if (!user.private_key) {
            const storedUser = this.getUser();
            if (storedUser && storedUser.private_key) {
                user.private_key = storedUser.private_key;
            } else {
                console.error('Warning: No private key found for user. End-to-end encryption will not work.');
            }
        }

        localStorage.setItem('user', JSON.stringify(user));
    }

    /**
     * Get token from localStorage
     * @returns Token string or null if not found
     */
    public getToken(): string | null {
        return localStorage.getItem('token');
    }

    /**
     * Get user data from localStorage
     * @returns User object or null if not found
     */
    public getUser(): AuthenticatedUser | null {
        const userFromLocal = localStorage.getItem('user');
        let user: AuthenticatedUser | null = null;

        try {
            if (userFromLocal) {
                user = JSON.parse(userFromLocal);
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }

        return user;
    }

    /**
     * Check if user is authenticated
     * @returns True if token exists
     */
    public isAuthenticated(): boolean {
        return !!this.getToken();
    }

    /**
     * Clear all authentication data from localStorage
     */
    public clearAuth(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    /**
     * Backward compatibility method for older code
     * @deprecated Use storeMessagesForContact instead
     */
    public async storeMessages(IncomingMessages: IMessage[]): Promise<void> {
        if (IncomingMessages.length === 0) {
            return;
        }

        try {
            const userId: number = IncomingMessages[0].sender_uid;
            const receiverId: number = IncomingMessages[0].receiver_uid;

            // Store messages using the new method
            await this.storeMessagesForContact(userId, receiverId, IncomingMessages);
        } catch (e) {
            console.error('Error in legacy storeMessages method:', e);
        }
    }

    /**
     * Backward compatibility method for older code
     * @deprecated Use getMessagesForContact instead
     */
    public async getStoredMessages(userId: number, contactId: number): Promise<IMessage[]> {
        return await this.getMessagesForContact(userId, contactId);
    }

    /**
     * Clear all user data including authentication and messages
     * Use this when logging out or deleting an account
     */
    public async clearAllUserData(): Promise<void> {
        // Clear authentication data
        this.clearAuth();

        // Delete all stored messages
        await this.deleteAllMessages();

        console.log('Cleared all user data from localStorage and IndexedDB');
    }

    /**
     * Get messages for a specific contact conversation with pagination
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @param page Page number (0-based)
     * @param pageSize Number of messages per page
     * @returns Promise resolving to paginated array of messages sorted by timestamp (newest first for UI display)
     */
    public async getMessagesForContactPaginated(userId: number, contactId: number, page: number = 0, pageSize: number = 50): Promise<{
        messages: IMessage[],
        totalCount: number,
        totalPages: number,
        currentPage: number
    }> {
        try {
            // Use the IndexedDB implementation
            return await indexedDBService.getMessagesForContactPaginated(userId, contactId, page, pageSize);
        } catch (e) {
            console.error('Error retrieving paginated messages for contact:', e);
            return {
                messages: [],
                totalCount: 0,
                totalPages: 0,
                currentPage: 0
            };
        }
    }

    /**
     * Optimize message storage by removing duplicates and obsolete entries
     * @param userId Current user ID
     * @param contactId Optional contact ID to optimize specific conversation
     * @returns Promise resolving to an object containing stats about the optimization
     */
    public async optimizeMessageStorage(userId: number, contactId?: number): Promise<{
        conversationsOptimized: number,
        duplicatesRemoved: number,
        bytesReclaimed: number
    }> {
        try {
            return await indexedDBService.optimizeMessageStorage(userId, contactId);
        } catch (e) {
            console.error('Error optimizing message storage:', e);
            return {
                conversationsOptimized: 0,
                duplicatesRemoved: 0,
                bytesReclaimed: 0
            };
        }
    }

    /**
     * Delete a single message from a conversation
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @param messageId The ID of the message to delete
     * @returns Promise resolving to true if successful, false otherwise
     */
    public async deleteMessage(userId: number, contactId: number, messageId: number): Promise<boolean> {
        try {
            return await indexedDBService.deleteMessage(userId, contactId, messageId);
        } catch (e) {
            console.error('Error deleting message:', e);
            return false;
        }
    }
}

export const storageService = new StorageService();
