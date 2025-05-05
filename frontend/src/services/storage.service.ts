import type { AuthenticatedUser } from '@/models/user-model';
import type { IMessage, IUserMessagesStore, IConversationStore, ILocalMessagesStore } from '@/models/message-model';


export class StorageService {
    /**
     * Store token in localStorage (persistent) or sessionStorage (temporary)
     * @param token JWT token
     * @param persistent Whether to store in localStorage (true) or sessionStorage (false)
     */
    public storeToken(token: string, persistent: boolean = false): void {
        if (persistent) {
            localStorage.setItem('token', token);
        } else {
            sessionStorage.setItem('token', token);
        }
    }

    public storeMessages(IncomingMessages: IMessage[]): void {

        if (IncomingMessages.length > 0) {

            const userId: number = IncomingMessages.at(0)!.sender_uid;
            const receiverId: number = IncomingMessages.at(0)!.receiver_uid;

            const messageStore: IConversationStore = {
                lastUpdated: Date.now().toString(),
                messages: IncomingMessages
            };
            const receiverStore: IUserMessagesStore = {};
            const userStore: ILocalMessagesStore = {};

            receiverStore[receiverId] = messageStore;
            userStore[userId] = receiverStore;

            localStorage.setItem('local_message_storing', JSON.stringify(userStore));

        }
        else {
            console.log("No Messages to Store")
        }


    }

    /**
     * Store user data in localStorage (persistent) or sessionStorage (temporary)
     * @param user User data to store
     * @param persistent Whether to store in localStorage (true) or sessionStorage (false)
     */
    public storeUser(user: AuthenticatedUser, persistent: boolean = false): void {
        if (persistent) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            sessionStorage.setItem('user', JSON.stringify(user));
            sessionStorage.setItem('uid', String(user.uid));
            sessionStorage.setItem('username', user.username);
            sessionStorage.setItem('private_key', user.private_key);
            sessionStorage.setItem('public_key', user.public_key);
            if (user.created_at) {
                sessionStorage.setItem('created_at', new Date(user.created_at).toISOString());
            }
            if (user.display_name) {
                sessionStorage.setItem('display_name', user.display_name);
            }
            if (user.shadow_mode !== undefined) {
                sessionStorage.setItem('shadow_mode', String(user.shadow_mode));
            }
            if (user.full_name_search !== undefined) {
                sessionStorage.setItem('full_name_search', String(user.full_name_search));
            }
        }
    }

    /**
     * Get token from localStorage or sessionStorage
     * @returns Token string or null if not found
     */
    public getToken(): string | null {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    }

    /**
     * Get user data from localStorage or sessionStorage
     * @returns User object or null if not found
     */
    public getUser(): AuthenticatedUser | null {
        const userFromLocal = localStorage.getItem('user');
        const userFromSession = sessionStorage.getItem('user');

        let user: AuthenticatedUser | null = null;

        try {
            if (userFromLocal) {
                user = JSON.parse(userFromLocal);
            } else if (userFromSession) {
                user = JSON.parse(userFromSession);
            } else {
                const uid = sessionStorage.getItem('uid');
                const username = sessionStorage.getItem('username');
                const token = this.getToken();
                const created_at = sessionStorage.getItem('created_at');
                const display_name = sessionStorage.getItem('display_name');
                const shadow_mode_str = sessionStorage.getItem('shadow_mode');
                const full_name_search_str = sessionStorage.getItem('full_name_search');
                const private_key = sessionStorage.getItem('private_key');
                const public_key = sessionStorage.getItem('public_key');

                if (uid && username && token && private_key && public_key) {
                    user = {
                        uid: Number(uid),
                        username,
                        created_at: created_at ? new Date(created_at) : new Date(),
                        token,
                        private_key,
                        public_key
                    };

                    if (display_name) {
                        user.display_name = display_name;
                    }
                    if (shadow_mode_str !== null) {
                        user.shadow_mode = shadow_mode_str === 'true';
                    }
                    if (full_name_search_str !== null) {
                        user.full_name_search = full_name_search_str === 'true';
                    }
                }
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
     * Clear all authentication data from both storages
     */
    public clearAuth(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('uid');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('created_at');
        sessionStorage.removeItem('display_name');
        sessionStorage.removeItem('shadow_mode');
        sessionStorage.removeItem('full_name_search');
        sessionStorage.removeItem('private_key');
        sessionStorage.removeItem('public_key');
    }
}

export const storageService = new StorageService();
