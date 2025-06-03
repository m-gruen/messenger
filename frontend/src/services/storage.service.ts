import type { AuthenticatedUser } from '@/models/user-model';
import type { IMessage } from '@/models/message-model';

export class StorageService {
    /**
     * Store token in localStorage
     * @param token JWT token
     */
    public storeToken(token: string): void {
        localStorage.setItem('token', token);
    }

    public storeMessages(IncomingMessages: IMessage[]): void {
        if (IncomingMessages.length === 0) {
            console.log("messages");
            return;
        }

        const userId: number = IncomingMessages[0].sender_uid;
        const receiverId: number = IncomingMessages[0].receiver_uid;

        const userIdStr = userId.toString();
        const receiverIdStr = receiverId.toString();

        const existingMessagesStr = localStorage.getItem('local_message_storing');
        let existingMessages: any = { messages: {} };

        if (existingMessagesStr) {
            try {
                const parsed = JSON.parse(existingMessagesStr);

                existingMessages = parsed.messages ? parsed : { messages: parsed };
            } catch (e) {
                console.error('Error parsing existing messages:', e);
            }
        }


        if (!existingMessages.messages[userIdStr]) {
            existingMessages.messages[userIdStr] = {};
        }
        
        if (!existingMessages.messages[receiverIdStr]) {
            existingMessages.messages[receiverIdStr] = {};
        }


        if (existingMessages.messages[userIdStr][receiverIdStr]) {
            const existingMids = new Set(existingMessages.messages[userIdStr][receiverIdStr].messages.map((msg: IMessage) => msg.mid));
            const uniqueNewMessages = IncomingMessages.filter(msg => !existingMids.has(msg.mid));

            existingMessages.messages[userIdStr][receiverIdStr].messages = [
                ...existingMessages.messages[userIdStr][receiverIdStr].messages,
                ...uniqueNewMessages
            ];
            existingMessages.messages[userIdStr][receiverIdStr].lastUpdated = Date.now().toString();
        } else {
            existingMessages.messages[userIdStr][receiverIdStr] = {
                lastUpdated: Date.now().toString(),
                messages: IncomingMessages
            };
        }

        if (existingMessages.messages[receiverIdStr][userIdStr]) {
            const existingMids = new Set(existingMessages.messages[receiverIdStr][userIdStr].messages.map((msg: IMessage) => msg.mid));
            const uniqueNewMessages = IncomingMessages.filter(msg => !existingMids.has(msg.mid));

            existingMessages.messages[receiverIdStr][userIdStr].messages = [
                ...existingMessages.messages[receiverIdStr][userIdStr].messages,
                ...uniqueNewMessages
            ];
            existingMessages.messages[receiverIdStr][userIdStr].lastUpdated = Date.now().toString();
        } else {
            existingMessages.messages[receiverIdStr][userIdStr] = {
                lastUpdated: Date.now().toString(),
                messages: IncomingMessages
            };
        }

        localStorage.setItem('local_message_storing', JSON.stringify(existingMessages));
    }

    /**
     * Retrieve stored messages for a specific conversation
     * @param userId Current user ID
     * @param contactId Contact user ID to get messages for
     * @returns Array of messages or empty array if none found
     */
    public getStoredMessages(userId: number, contactId: number): IMessage[] {
        
        const userIdStr = userId.toString();
        const contactIdStr = contactId.toString();
        
        const existingMessagesStr = localStorage.getItem('local_message_storing');
        if (!existingMessagesStr) {
            return [];
        }
        
        try {
            const existingMessages: any = JSON.parse(existingMessagesStr);
            
            const userToContactMessages = existingMessages.messages[userIdStr]?.[contactIdStr]?.messages || [];
            const contactToUserMessages = existingMessages.messages[contactIdStr]?.[userIdStr]?.messages || [];
            
            if (userToContactMessages.length > 0 || contactToUserMessages.length > 0) {

                const allMessages = [...userToContactMessages, ...contactToUserMessages];
                const uniqueMessages = Array.from(
                    new Map(allMessages.map((msg: IMessage) => [msg.mid, msg])).values()
                );
                
                return uniqueMessages.sort((a, b) => {
                    const timeA = new Date(a.timestamp).getTime();
                    const timeB = new Date(b.timestamp).getTime();
                    return timeA - timeB;
                });
            }
            
            return [];
        } catch (e) {
            console.error('Error retrieving stored messages:', e);
            return [];
        }
    }

    /**
     * Store user data in localStorage
     * @param user User data to store
     */
    public storeUser(user: AuthenticatedUser): void {
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
}

export const storageService = new StorageService();
