import { getBackendUrl } from '../lib/config';
import type { AuthenticatedUser } from '@/models/user-model';
import type { IMessage } from '@/models/message-model';
import type { Contact } from '@/models/contact-model';

/**
 * Service responsible for handling all API calls to the backend
 */
export class ApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = getBackendUrl();
    }

    /**
     * Creates the Authorization header with the token
     * @param token JWT token
     * @returns Headers object with Authorization
     */
    private createAuthHeader(token: string): Headers {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('Authorization', `Bearer ${token}`);
        return headers;
    }

    /**
     * Login a user
     * @param username User's username
     * @param password User's password
     * @returns AuthenticatedUser data with token
     */
    async login(username: string, password: string): Promise<AuthenticatedUser> {
        const response = await fetch(`${this.baseUrl}/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        return {
            uid: data.uid,
            username: data.username,
            created_at: data.created_at,
            token: data.token,
            display_name: data.display_name,
            is_deleted: data.is_deleted,
            shadow_mode: data.shadow_mode,
            full_name_search: data.full_name_search
        };
    }

    /**
     * Register a new user
     * @param username New user's username
     * @param password New user's password
     * @returns User data with token
     */
    async register(username: string, password: string): Promise<AuthenticatedUser> {
        const response = await fetch(`${this.baseUrl}/user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        return {
            uid: data.uid,
            username: data.username,
            created_at: data.created_at,
            token: data.token,
            display_name: data.display_name,
            is_deleted: data.is_deleted,
            shadow_mode: data.shadow_mode,
            full_name_search: data.full_name_search
        };
    }

    /**
     * Get contacts for a user
     * @param uid User ID
     * @param token JWT token
     * @returns List of contacts
     */
    async getContacts(uid: number, token: string): Promise<Contact[]> {
        const response = await fetch(`${this.baseUrl}/contact/${uid}`, {
            method: 'GET',
            headers: this.createAuthHeader(token)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch contacts');
        }

        // Process the dates from strings to Date objects
        return data.map((contact: any) => ({
            ...contact,
            createdAt: new Date(contact.createdAt)
        }));
    }

    /**
     * Add a new contact
     * @param userId Current user ID
     * @param contactUsername Username to add as contact
     * @param token JWT token
     * @returns The created contact
     */
    async addContact(userId: number, contactUsername: string, token: string): Promise<Contact> {
        const response = await fetch(`${this.baseUrl}/contact`, {
            method: 'POST',
            headers: this.createAuthHeader(token),
            body: JSON.stringify({
                userId,
                contactUsername
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to add contact');
        }

        return {
            ...data,
            createdAt: new Date(data.createdAt)
        };
    }

    /**
     * Update contact status (accept, reject, block)
     * @param contactId ID of the contact to update
     * @param status New contact status
     * @param token JWT token
     * @returns Updated contact
     */
    async updateContactStatus(contactId: number, status: string, token: string): Promise<Contact> {
        const response = await fetch(`${this.baseUrl}/contact/${contactId}`, {
            method: 'PUT',
            headers: this.createAuthHeader(token),
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update contact status');
        }

        return {
            ...data,
            createdAt: new Date(data.createdAt)
        };
    }

    /**
     * Get messages between two users
     * @param senderUid Sender user ID
     * @param receiverUid Receiver user ID
     * @param token JWT token
     * @returns List of messages
     */
    async getMessages(senderUid: number, receiverUid: number, token: string): Promise<IMessage[]> {
        const response = await fetch(`${this.baseUrl}/message?sender_uid=${senderUid}&receiver_uid=${receiverUid}`, {
            method: 'GET',
            headers: this.createAuthHeader(token)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch messages');
        }

        // Process the timestamps from strings to Date objects
        return data.map((message: any) => ({
            ...message,
            timestamp: new Date(message.timestamp)
        }));
    }

    /**
     * Send a message
     * @param senderUid Sender user ID
     * @param receiverUid Receiver user ID
     * @param content Message content
     * @param token JWT token
     * @returns The sent message
     */
    async sendMessage(senderUid: number, receiverUid: number, content: string, token: string): Promise<IMessage> {
        const response = await fetch(`${this.baseUrl}/message`, {
            method: 'POST',
            headers: this.createAuthHeader(token),
            body: JSON.stringify({
                sender_uid: senderUid,
                receiver_uid: receiverUid,
                content
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send message');
        }

        return {
            ...data,
            timestamp: new Date(data.timestamp)
        };
    }

    /**
     * Update user profile
     * @param uid User ID
     * @param updateData Update data
     * @param token JWT token
     * @returns Updated user data
     */
    async updateUser(uid: number, updateData: any, token: string): Promise<AuthenticatedUser> {
        const response = await fetch(`${this.baseUrl}/user/${uid}`, {
            method: 'PUT',
            headers: this.createAuthHeader(token),
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update user');
        }

        return data;
    }
}

// Export a singleton instance
export const apiService = new ApiService();
