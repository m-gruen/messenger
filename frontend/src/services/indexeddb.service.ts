import type { IMessage } from '@/models/message-model';

/**
 * Interface for conversation data storage
 */
interface ConversationData {
    lastUpdated: string;
    messages: IMessage[];
}

// Database constants
const DB_NAME = 'messenger_db';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';

export class IndexedDBService {
    private db: IDBDatabase | null = null;
    private dbPromise: Promise<IDBDatabase> | null = null;

    /**
     * Initialize the IndexedDB database
     */
    public async initDatabase(): Promise<IDBDatabase> {
        if (this.db) {
            return this.db;
        }

        if (this.dbPromise) {
            return this.dbPromise;
        }

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event);
                reject('Could not open IndexedDB');
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                // Create object store for messages if it doesn't exist
                if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
                    // The key is the conversation key (e.g., 'messages_1_2')
                    db.createObjectStore(MESSAGES_STORE);
                }
            };
        });

        return this.dbPromise;
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
    public async storeMessagesForContact(userId: number, contactId: number, messages: IMessage[]): Promise<void> {
        if (messages.length === 0) {
            console.log("No messages to store");
            return;
        }

        try {
            const db = await this.initDatabase();
            const key = this.getConversationKey(userId, contactId);
            
            // Start a transaction
            const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
            const store = transaction.objectStore(MESSAGES_STORE);
            
            // Get existing data
            const request = store.get(key);
            
            request.onsuccess = (event) => {
                const existingData = (event.target as IDBRequest).result as ConversationData || {
                    lastUpdated: Date.now().toString(),
                    messages: []
                };

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

                // Store updated data
                store.put(existingData, key);
                
                console.log(`Stored ${uniqueNewMessages.length} new messages for conversation between ${userId} and ${contactId}`);
            };

            request.onerror = (event) => {
                console.error('Error storing messages in IndexedDB:', event);
            };
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
            await this.storeMessagesForContact(userId, contactId, [message]);
        } catch (e) {
            console.error('Error adding message to contact:', e);
        }
    }

    /**
     * Delete all messages for a specific contact
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns Promise resolving to true if successful, false otherwise
     */
    public async deleteMessagesForContact(userId: number, contactId: number): Promise<boolean> {
        try {
            const db = await this.initDatabase();
            const key = this.getConversationKey(userId, contactId);
            
            // Start a transaction
            const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
            const store = transaction.objectStore(MESSAGES_STORE);
            
            // Delete the entry
            const request = store.delete(key);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log(`Deleted messages for conversation between ${userId} and ${contactId}`);
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.error('Error deleting messages:', event);
                    reject(false);
                };
            });
        } catch (e) {
            console.error('Error deleting messages for contact:', e);
            return false;
        }
    }

    /**
     * Get all messages for a specific contact conversation
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns Promise resolving to an array of messages sorted by timestamp
     */
    public async getMessagesForContact(userId: number, contactId: number): Promise<IMessage[]> {
        try {
            const db = await this.initDatabase();
            const key = this.getConversationKey(userId, contactId);
            
            // Start a transaction
            const transaction = db.transaction([MESSAGES_STORE], 'readonly');
            const store = transaction.objectStore(MESSAGES_STORE);
            
            // Get the data
            const request = store.get(key);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    const data = (event.target as IDBRequest).result as ConversationData;
                    if (!data) {
                        resolve([]);
                    } else {
                        resolve(data.messages || []);
                    }
                };
                
                request.onerror = (event) => {
                    console.error('Error retrieving messages:', event);
                    reject([]);
                };
            });
        } catch (e) {
            console.error('Error retrieving messages for contact:', e);
            return [];
        }
    }

    /**
     * Get the last message for a specific contact conversation
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @returns Promise resolving to the most recent message or null if none found
     */
    public async getLastMessageForContact(userId: number, contactId: number): Promise<IMessage | null> {
        try {
            const messages = await this.getMessagesForContact(userId, contactId);
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
     * Delete all messages stored in IndexedDB
     */
    public async deleteAllMessages(): Promise<void> {
        try {
            const db = await this.initDatabase();
            
            // Start a transaction
            const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
            const store = transaction.objectStore(MESSAGES_STORE);
            
            // Clear all entries
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('Cleared all stored messages');
            };
            
            request.onerror = (event) => {
                console.error('Error clearing messages:', event);
            };
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
            const messages = await this.getMessagesForContact(userId, contactId);
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
     * @returns Promise resolving to the number of messages
     */
    public async countMessagesForContact(userId: number, contactId: number): Promise<number> {
        try {
            const messages = await this.getMessagesForContact(userId, contactId);
            return messages.length;
        } catch (e) {
            console.error('Error counting messages:', e);
            return 0;
        }
    }

    /**
     * Get messages for a specific contact conversation with pagination
     * @param userId Current user ID
     * @param contactId Contact user ID
     * @param page Page number (0-based)
     * @param pageSize Number of messages per page
     * @returns Promise resolving to paginated array of messages and pagination info
     */
    public async getMessagesForContactPaginated(
        userId: number, 
        contactId: number, 
        page: number = 0, 
        pageSize: number = 50
    ): Promise<{
        messages: IMessage[],
        totalCount: number,
        totalPages: number,
        currentPage: number
    }> {
        try {
            // Get all messages first
            const allMessages = await this.getMessagesForContact(userId, contactId);
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
    public async optimizeMessageStorage(
        userId: number, 
        contactId?: number
    ): Promise<{
        conversationsOptimized: number,
        duplicatesRemoved: number,
        bytesReclaimed: number
    }> {
        try {
            const db = await this.initDatabase();
            let conversationsOptimized = 0;
            let duplicatesRemoved = 0;
            let bytesReclaimed = 0;
            
            // Start a transaction
            const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
            const store = transaction.objectStore(MESSAGES_STORE);
            
            // Get all keys
            const keysRequest = store.getAllKeys();
            
            return new Promise((resolve) => {
                keysRequest.onsuccess = async (event) => {
                    const keys = (event.target as IDBRequest).result as string[];
                    const keysToOptimize: string[] = [];
                    
                    // Filter keys if contactId is provided
                    for (const key of keys) {
                        if (key.startsWith('messages_')) {
                            if (contactId) {
                                const specificKey = this.getConversationKey(userId, contactId);
                                if (key === specificKey) {
                                    keysToOptimize.push(key);
                                }
                            } else {
                                if (key.startsWith(`messages_${userId}_`)) {
                                    keysToOptimize.push(key);
                                }
                            }
                        }
                    }
                    
                    // Optimize each conversation
                    for (const key of keysToOptimize) {
                        const getRequest = store.get(key);
                        
                        await new Promise<void>(resolveKey => {
                            getRequest.onsuccess = (event) => {
                                const data = (event.target as IDBRequest).result as ConversationData;
                                if (data && data.messages && Array.isArray(data.messages)) {
                                    // Find and remove duplicates by message ID
                                    const beforeSize = JSON.stringify(data).length;
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
                                        store.put(data, key);
                                        
                                        duplicatesRemoved += removed;
                                        conversationsOptimized++;
                                        
                                        // Calculate bytes reclaimed
                                        const afterSize = JSON.stringify(data).length;
                                        bytesReclaimed += Math.max(0, beforeSize - afterSize);
                                    }
                                }
                                resolveKey();
                            };
                            
                            getRequest.onerror = () => {
                                resolveKey();
                            };
                        });
                    }
                    
                    resolve({
                        conversationsOptimized,
                        duplicatesRemoved,
                        bytesReclaimed
                    });
                };
                
                keysRequest.onerror = () => {
                    resolve({
                        conversationsOptimized: 0,
                        duplicatesRemoved: 0,
                        bytesReclaimed: 0
                    });
                };
            });
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
     * Export all messages from IndexedDB
     * @returns Promise resolving to an object with all message data
     */
    public async exportAllMessages(): Promise<Record<string, any>> {
        try {
            const db = await this.initDatabase();
            
            // Start a transaction
            const transaction = db.transaction([MESSAGES_STORE], 'readonly');
            const store = transaction.objectStore(MESSAGES_STORE);
            
            // Get all keys
            const keysRequest = store.getAllKeys();
            
            return new Promise((resolve, reject) => {
                keysRequest.onsuccess = async (event) => {
                    const keys = (event.target as IDBRequest).result as string[];
                    const exportData: Record<string, any> = {};
                    
                    // Get data for each key
                    for (const key of keys) {
                        if (key.startsWith('messages_')) {
                            const getRequest = store.get(key);
                            
                            await new Promise<void>(resolveKey => {
                                getRequest.onsuccess = (event) => {
                                    const data = (event.target as IDBRequest).result;
                                    exportData[key] = data;
                                    resolveKey();
                                };
                                
                                getRequest.onerror = () => resolveKey();
                            });
                        }
                    }
                    
                    resolve(exportData);
                };
                
                keysRequest.onerror = () => {
                    reject('Failed to export messages');
                };
            });
        } catch (e) {
            console.error('Error exporting messages:', e);
            return {};
        }
    }

    /**
     * Import messages into IndexedDB
     * @param data Object containing message data to import
     * @returns Promise resolving to number of conversations imported
     */
    public async importMessages(data: Record<string, any>): Promise<number> {
        try {
            const db = await this.initDatabase();
            let importedCount = 0;
            
            // Start a transaction
            const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
            const store = transaction.objectStore(MESSAGES_STORE);
            
            // Import each conversation
            for (const [key, value] of Object.entries(data)) {
                if (key.startsWith('messages_')) {
                    const putRequest = store.put(value, key);
                    
                    await new Promise<void>(resolveKey => {
                        putRequest.onsuccess = () => {
                            importedCount++;
                            resolveKey();
                        };
                        
                        putRequest.onerror = () => resolveKey();
                    });
                }
            }
            
            return importedCount;
        } catch (e) {
            console.error('Error importing messages:', e);
            return 0;
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
            const db = await this.initDatabase();
            const key = this.getConversationKey(userId, contactId);
            
            // Start a transaction
            const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
            const store = transaction.objectStore(MESSAGES_STORE);
            
            // Get existing data
            const request = store.get(key);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    const existingData = (event.target as IDBRequest).result as ConversationData;
                    
                    if (!existingData || !existingData.messages || existingData.messages.length === 0) {
                        console.log(`No messages found for conversation between ${userId} and ${contactId}`);
                        resolve(false);
                        return;
                    }
                    
                    // Find the index of the message to delete
                    const messageIndex = existingData.messages.findIndex(m => m.mid === messageId);
                    
                    if (messageIndex === -1) {
                        console.log(`Message with ID ${messageId} not found in conversation`);
                        resolve(false);
                        return;
                    }
                    
                    // Remove the message from the array
                    existingData.messages.splice(messageIndex, 1);
                    
                    // Update timestamp
                    existingData.lastUpdated = Date.now().toString();
                    
                    // Save the updated data
                    const updateRequest = store.put(existingData, key);
                    
                    updateRequest.onsuccess = () => {
                        console.log(`Deleted message ${messageId} from conversation between ${userId} and ${contactId}`);
                        resolve(true);
                    };
                    
                    updateRequest.onerror = (error) => {
                        console.error('Error updating conversation data:', error);
                        reject(false);
                    };
                };
                
                request.onerror = (error) => {
                    console.error('Error retrieving conversation data:', error);
                    reject(false);
                };
            });
        } catch (e) {
            console.error('Error deleting message:', e);
            return false;
        }
    }
}

export const indexedDBService = new IndexedDBService();
