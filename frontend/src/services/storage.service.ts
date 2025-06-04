// filepath: /home/mark/projects/WMC/self-hosted-e2e-messenger/frontend/src/services/storage.service.ts
import type { AuthenticatedUser } from '@/models/user-model';
import type { IMessage } from '@/models/message-model';

/**
 * Interface for conversation data storage
 */
interface ConversationData {
    lastUpdated: string;
    messages: IMessage[];
}

export class StorageService {
    /**
     * Store token in localStorage
     * @param token JWT token
     */
    public storeToken(token: string): void {
        localStorage.setItem('token', token);
    }

    /**
     * Generate a unique storage key for a conversation between two users
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns Unique storage key for the conversation
     */
    private getConversationKey(userId: number, contactId: number): string {
        return `messages_${userId}_${contactId}`;
    }

    /**
     * Store messages for a specific contact conversation
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @param messages Array of messages to store
     */
    public storeMessagesForContact(userId: number, contactId: number, messages: IMessage[]): void {
        if (messages.length === 0) {
            console.log("No messages to store");
            return;
        }

        try {
            // Generate unique key for this conversation
            const key = this.getConversationKey(userId, contactId);

            // Get existing conversation data if any
            const existingDataStr = localStorage.getItem(key);
            let existingData: ConversationData = {
                lastUpdated: Date.now().toString(),
                messages: []
            };

            if (existingDataStr) {
                try {
                    existingData = JSON.parse(existingDataStr);
                } catch (e) {
                    console.error(`Error parsing existing messages for conversation ${key}:`, e);
                }
            }

            // Create set of existing message IDs for fast lookup
            const existingMids = new Set(existingData.messages.map(msg => msg.mid));
            
            // Filter out duplicate messages
            const uniqueNewMessages = messages.filter(msg => !existingMids.has(msg.mid));
            
            // Combine existing and new messages
            existingData.messages = [...existingData.messages, ...uniqueNewMessages];
            
            // Update timestamp
            existingData.lastUpdated = Date.now().toString();
            
            // Sort messages by timestamp (oldest first)
            existingData.messages.sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                return timeA - timeB;
            });

            // Store updated conversation data
            localStorage.setItem(key, JSON.stringify(existingData));
            
            console.log(`Stored ${uniqueNewMessages.length} new messages for conversation between ${userId} and ${contactId}`);
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
    public addMessageToContact(userId: number, contactId: number, message: IMessage): void {
        try {
            this.storeMessagesForContact(userId, contactId, [message]);
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
    public deleteMessagesForContact(userId: number, contactId: number): boolean {
        try {
            const key = this.getConversationKey(userId, contactId);
            localStorage.removeItem(key);
            console.log(`Deleted messages for conversation between ${userId} and ${contactId}`);
            return true;
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
    public getMessagesForContact(userId: number, contactId: number): IMessage[] {
        try {
            // Generate unique key for this conversation
            const key = this.getConversationKey(userId, contactId);
            
            // Get data from localStorage
            const dataStr = localStorage.getItem(key);
            if (!dataStr) {
                return [];
            }
            
            // Parse and return messages
            const data: ConversationData = JSON.parse(dataStr);
            return data.messages || [];
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
    public getLastMessageForContact(userId: number, contactId: number): IMessage | null {
        try {
            const messages = this.getMessagesForContact(userId, contactId);
            if (messages.length === 0) {
                return null;
            }
            
            // Return the last message (since they are sorted by timestamp)
            return messages[messages.length - 1];
        } catch (e) {
            console.error('Error getting last message for contact:', e);
            return null;
        }
    }

    /**
     * Delete all messages stored in localStorage
     */
    public deleteAllMessages(): void {
        try {
            // Find all keys that match our message storage pattern
            const messageKeys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('messages_')) {
                    messageKeys.push(key);
                }
            }
            
            // Remove each message storage item
            messageKeys.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log(`Cleared all stored messages (${messageKeys.length} conversations)`);
        } catch (e) {
            console.error('Error deleting all messages:', e);
        }
    }
    
    /**
     * Check if there are any messages stored for a specific contact
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns True if messages exist, false otherwise
     */
    public hasMessagesForContact(userId: number, contactId: number): boolean {
        try {
            const messages = this.getMessagesForContact(userId, contactId);
            return messages.length > 0;
        } catch (e) {
            console.error('Error checking for messages:', e);
            return false;
        }
    }
    
    /**
     * Count the number of messages stored for a specific contact
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns Number of messages
     */
    public countMessagesForContact(userId: number, contactId: number): number {
        try {
            const messages = this.getMessagesForContact(userId, contactId);
            return messages.length;
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
    public storeMessages(IncomingMessages: IMessage[]): void {
        if (IncomingMessages.length === 0) {
            return;
        }
        
        try {
            const userId: number = IncomingMessages[0].sender_uid;
            const receiverId: number = IncomingMessages[0].receiver_uid;
            
            // Store messages using the new method
            this.storeMessagesForContact(userId, receiverId, IncomingMessages);
        } catch (e) {
            console.error('Error in legacy storeMessages method:', e);
        }
    }
    
    /**
     * Backward compatibility method for older code
     * @deprecated Use getMessagesForContact instead
     */
    public getStoredMessages(userId: number, contactId: number): IMessage[] {
        return this.getMessagesForContact(userId, contactId);
    }
    
    /**
     * Clear all user data including authentication and messages
     * Use this when logging out or deleting an account
     */
    public clearAllUserData(): void {
        // Clear authentication data
        this.clearAuth();
        
        // Delete all stored messages
        this.deleteAllMessages();
        
        console.log('Cleared all user data from localStorage');
    }

    /**
     * Get messages for a specific contact conversation with pagination
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @param page Page number (0-based)
     * @param pageSize Number of messages per page
     * @returns Paginated array of messages sorted by timestamp (newest first for UI display)
     */
    public getMessagesForContactPaginated(userId: number, contactId: number, page: number = 0, pageSize: number = 50): {
        messages: IMessage[],
        totalCount: number,
        totalPages: number,
        currentPage: number
    } {
        try {
            // Get all messages first
            const allMessages = this.getMessagesForContact(userId, contactId);
            const totalCount = allMessages.length;
            
            if (totalCount === 0) {
                return {
                    messages: [],
                    totalCount: 0,
                    totalPages: 0,
                    currentPage: 0
                };
            }
            
            // Calculate pagination values
            const totalPages = Math.ceil(totalCount / pageSize);
            const safePageNumber = Math.max(0, Math.min(page, totalPages - 1));
            
            // Sort messages by timestamp (newest first for UI display)
            const sortedMessages = [...allMessages].sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeB - timeA; // Newest first
            });
            
            // Extract the page
            const startIndex = safePageNumber * pageSize;
            const endIndex = Math.min(startIndex + pageSize, totalCount);
            const pagedMessages = sortedMessages.slice(startIndex, endIndex);
            
            return {
                messages: pagedMessages,
                totalCount,
                totalPages,
                currentPage: safePageNumber
            };
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
     * @returns Object containing stats about the optimization
     */
    public optimizeMessageStorage(userId: number, contactId?: number): {
        conversationsOptimized: number,
        duplicatesRemoved: number,
        bytesReclaimed: number
    } {
        try {
            let conversationsOptimized = 0;
            let duplicatesRemoved = 0;
            let bytesReclaimed = 0;
            
            // Find keys to optimize
            const keysToOptimize: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('messages_')) {
                    // If contactId is provided, only optimize that specific conversation
                    if (contactId) {
                        const specificKey = this.getConversationKey(userId, contactId);
                        if (key === specificKey) {
                            keysToOptimize.push(key);
                        }
                    } else {
                        // Otherwise optimize all conversations for this user
                        if (key.startsWith(`messages_${userId}_`)) {
                            keysToOptimize.push(key);
                        }
                    }
                }
            }
            
            // Optimize each conversation
            for (const key of keysToOptimize) {
                const beforeSize = (localStorage.getItem(key) || '').length;
                const data = JSON.parse(localStorage.getItem(key) || '{}');
                
                if (data.messages && Array.isArray(data.messages)) {
                    // Find and remove duplicates by message ID
                    const uniqueMessages = new Map();
                    for (const message of data.messages) {
                        uniqueMessages.set(message.mid, message);
                    }
                    
                    const uniqueArray = Array.from(uniqueMessages.values());
                    const removed = data.messages.length - uniqueArray.length;
                    
                    // Update data if we found duplicates
                    if (removed > 0) {
                        data.messages = uniqueArray;
                        data.lastUpdated = Date.now().toString();
                        
                        // Save optimized data
                        localStorage.setItem(key, JSON.stringify(data));
                        
                        duplicatesRemoved += removed;
                        conversationsOptimized++;
                        
                        // Calculate bytes reclaimed
                        const afterSize = (localStorage.getItem(key) || '').length;
                        bytesReclaimed += Math.max(0, beforeSize - afterSize);
                    }
                }
            }
            
            return {
                conversationsOptimized,
                duplicatesRemoved,
                bytesReclaimed
            };
        } catch (e) {
            console.error('Error optimizing message storage:', e);
            return {
                conversationsOptimized: 0,
                duplicatesRemoved: 0,
                bytesReclaimed: 0
            };
        }
    }
}

export const storageService = new StorageService();
