import { getBackendUrl } from '../lib/config';
import { StatusCodes } from 'http-status-codes';
import type { AuthenticatedUser, User } from '@/models/user-model';
import type { IMessage } from '@/models/message-model';
import type { Contact } from '@/models/contact-model';
import { DateFormatService } from './date-format.service';
import { storageService } from '@/services/storage.service';
import { encryptionService } from './encryption.service';

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
     * Base fetch function to handle common fetch logic
     * @param url API endpoint URL
     * @param options Fetch options
     * @param token JWT token (optional)
     * @returns Response data
     */
    private async fetchApi<T>(url: string, options: RequestInit, token?: string): Promise<T> {
        if (token) {
            options.headers = this.createAuthHeader(token);
        } else if (!options.headers) {
            options.headers = {
                'Content-Type': 'application/json'
            };
        }

        const response = await fetch(url, options);
        let data: any;

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json') && response.status !== StatusCodes.NO_CONTENT) {
            data = await response.json();
        }

        if (!response.ok) {
            throw new Error(data?.error || `Request failed with status ${response.status}`);
        }

        return data as T;
    }

    /**
     * Login a user
     * @param username User's username
     * @param password User's password
     * @returns AuthenticatedUser data with token
     */
    public async login(username: string, password: string): Promise<AuthenticatedUser> {
        const data = await this.fetchApi<AuthenticatedUser>(`${this.baseUrl}/user/login`, {
            method: 'POST',
            body: JSON.stringify({
                username,
                password
            })
        });

        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser && storedUser.uid === data.uid && storedUser.private_key) {
            data.private_key = storedUser.private_key;
        } else {
            console.warn('No private key found for user. Generating new key pair...');
            const { publicKey, privateKey } = await encryptionService.generateKeyPair();
            try {
                await this.fetchApi<void>(`${this.baseUrl}/user/${data.uid}/keys`, {
                    method: 'PUT',
                    body: JSON.stringify({ publicKey })
                }, data.token);
                
                data.private_key = privateKey;
                data.public_key = publicKey;
            } catch (error) {
                console.error('Failed to update keys during login:', error);
            }
        }

        return data;
    }

    /**
     * Register a new user
     * @param username New user's username
     * @param password New user's password
     * @param displayName Optional display name
     * @returns User data with token
     */
    public async register(username: string, password: string, displayName?: string): Promise<AuthenticatedUser> {
        const { publicKey, privateKey } = await encryptionService.generateKeyPair();

        localStorage.setItem('temp_private_key', privateKey);

        const data = await this.fetchApi<AuthenticatedUser>(`${this.baseUrl}/user`, {
            method: 'POST',
            body: JSON.stringify({
                username,
                password,
                displayName,
                publicKey
            })
        });

        const userWithPrivateKey: AuthenticatedUser = {
            ...data,
            private_key: privateKey
        };

        localStorage.removeItem('temp_private_key');

        return userWithPrivateKey;
    }

    /**
     * Get user by ID
     * @param uid User ID
     * @param token JWT token
     * @returns User data
     */
    public async getUserById(uid: number, token: string): Promise<User> {
        return await this.fetchApi<User>(`${this.baseUrl}/user/${uid}`, {
            method: 'GET'
        }, token);
    }

    /**
     * Search users by query
     * @param query Search term
     * @param limit Maximum number of results (default: 20)
     * @param token JWT token
     * @returns List of users
     */
    public async searchUsers(query: string, token: string, limit: number = 20): Promise<User[]> {
        return await this.fetchApi<User[]>(
            `${this.baseUrl}/user/search?query=${encodeURIComponent(query)}&limit=${limit}`,
            { method: 'GET' },
            token
        );
    }

    /**
     * Update user profile
     * @param uid User ID
     * @param updateData Update data (username, displayName, shadowMode, fullNameSearch)
     * @param token JWT token
     * @returns Updated user data
     */
    public async updateUser(uid: number, updateData: any, token: string): Promise<AuthenticatedUser> {
        return await this.fetchApi<AuthenticatedUser>(`${this.baseUrl}/user/${uid}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        }, token);
    }

    /**
     * Update user password
     * @param uid User ID
     * @param currentPassword Current password for verification
     * @param newPassword New password to set
     * @param token JWT token
     * @returns Updated user data with new token
     */
    public async updatePassword(uid: number, currentPassword: string, newPassword: string, token: string): Promise<AuthenticatedUser> {
        return await this.fetchApi<AuthenticatedUser>(`${this.baseUrl}/user/${uid}/password`, {
            method: 'PUT',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        }, token);
    }

    /**
     * Update user's public key
     * @param uid User ID
     * @param publicKey New public key
     * @param token JWT token
     * @returns Updated user data
     */
    public async updatePublicKey(uid: number, publicKey: string, token: string): Promise<AuthenticatedUser> {
        return await this.fetchApi<AuthenticatedUser>(`${this.baseUrl}/user/${uid}/keys`, {
            method: 'PUT',
            body: JSON.stringify({
                publicKey
            })
        }, token);
    }

    /**
     * Delete user account (soft delete)
     * @param uid User ID
     * @param token JWT token
     */
    public async deleteUser(uid: number, token: string): Promise<void> {
        await this.fetchApi<void>(`${this.baseUrl}/user/${uid}`, {
            method: 'DELETE'
        }, token);
    }

    /**
     * Get contacts for a user
     * @param userId User ID
     * @param token JWT token
     * @returns List of contacts
     */
    public async getContacts(userId: number, token: string): Promise<Contact[]> {
        const data = await this.fetchApi<any[]>(`${this.baseUrl}/contact/${userId}`, {
            method: 'GET'
        }, token);

        return data.map((contact: any) => ({
            ...contact,
            createdAt: DateFormatService.createDateWithTimezone(contact.createdAt)
        }));
    }

    /**
     * Add a new contact
     * @param userId Current user ID
     * @param contactUserId User ID to add as contact
     * @param token JWT token
     */
    public async addContact(userId: number, contactUserId: number, token: string): Promise<void> {
        await this.fetchApi<void>(`${this.baseUrl}/contact/${userId}`, {
            method: 'POST',
            body: JSON.stringify({
                contactUserId
            })
        }, token);
    }

    /**
     * Block or unblock a contact
     * @param userId User ID
     * @param contactUserId Contact's user ID
     * @param blocked Whether to block (true) or unblock (false)
     * @param token JWT token
     */
    public async updateContactBlockStatus(userId: number, contactUserId: number, blocked: boolean, token: string): Promise<void> {
        await this.fetchApi<void>(`${this.baseUrl}/contact/${userId}/${contactUserId}/block`, {
            method: 'PUT',
            body: JSON.stringify({
                blocked
            })
        }, token);
    }

    /**
     * Delete a contact
     * @param userId User ID
     * @param contactUserId Contact's user ID
     * @param token JWT token
     */
    public async deleteContact(userId: number, contactUserId: number, token: string): Promise<void> {
        await this.fetchApi<void>(`${this.baseUrl}/contact/${userId}/${contactUserId}`, {
            method: 'DELETE'
        }, token);
    }

    /**
     * Get incoming contact requests
     * @param userId User ID
     * @param token JWT token
     * @returns List of incoming contact requests
     */
    public async getIncomingContactRequests(userId: number, token: string): Promise<Contact[]> {
        const data = await this.fetchApi<any[]>(`${this.baseUrl}/contact/${userId}/requests/incoming`, {
            method: 'GET'
        }, token);

        return data.map((contact: any) => ({
            ...contact,
            createdAt: DateFormatService.createDateWithTimezone(contact.createdAt)
        }));
    }

    /**
     * Get outgoing contact requests
     * @param userId User ID
     * @param token JWT token
     * @returns List of outgoing contact requests
     */
    public async getOutgoingContactRequests(userId: number, token: string): Promise<Contact[]> {
        const data = await this.fetchApi<any[]>(`${this.baseUrl}/contact/${userId}/requests/outgoing`, {
            method: 'GET'
        }, token);

        return data.map((contact: any) => ({
            ...contact,
            createdAt: DateFormatService.createDateWithTimezone(contact.createdAt)
        }));
    }

    /**
     * Accept a contact request
     * @param userId User ID
     * @param contactUserId Contact's user ID
     * @param token JWT token
     */
    public async acceptContactRequest(userId: number, contactUserId: number, token: string): Promise<void> {
        await this.fetchApi<void>(`${this.baseUrl}/contact/${userId}/requests/${contactUserId}/accept`, {
            method: 'PUT'
        }, token);
    }

    /**
     * Reject a contact request
     * @param userId User ID
     * @param contactUserId Contact's user ID
     * @param token JWT token
     */
    public async rejectContactRequest(userId: number, contactUserId: number, token: string): Promise<void> {
        await this.fetchApi<void>(`${this.baseUrl}/contact/${userId}/requests/${contactUserId}/reject`, {
            method: 'PUT'
        }, token);
    }

    /**
     * Get messages between two users
     * @param userId User ID
     * @param receiverId Receiver's user ID
     * @param token JWT token
     * @returns List of messages
     */
    public async getMessages(userId: number, receiverId: number, token: string): Promise<IMessage[]> {
        const data = await this.fetchApi<any[]>(`${this.baseUrl}/message/${userId}?receiverId=${receiverId}`, {
            method: 'GET'
        }, token);

        const server: User = await this.getUserById(receiverId, token);
        const client: AuthenticatedUser | null = storageService.getUser();

        if (!client) {
            console.error('User not found in storage');
            // Return messages with error indicators instead of throwing
            return data.map(message => ({
                ...message,
                content: "⚠️ Cannot decrypt message: User authentication error.",
                timestamp: DateFormatService.createDateWithTimezone(message.timestamp),
                decryptionFailed: true
            }));
        }

        if (!client.private_key) {
            console.error('No private key found. Unable to decrypt messages.');
            // Return messages with error indicators instead of throwing
            return data.map(message => ({
                ...message,
                content: "⚠️ Cannot decrypt message: Private key is missing.",
                timestamp: DateFormatService.createDateWithTimezone(message.timestamp),
                decryptionFailed: true
            }));
        }

        return await Promise.all(
            data.map(async (message: any) => {
                try {
                    const decryptedContent = await encryptionService.decryptMessage(
                        server,
                        client,
                        {
                            encryptedContentBase64: message.content,
                            nonceBase64: message.nonce
                        },
                        client.uid === message.sender_uid
                    );
                    return {
                        ...message,
                        content: decryptedContent,
                        timestamp: DateFormatService.createDateWithTimezone(message.timestamp)
                    };
                } catch (error) {
                    console.error('Failed to decrypt message:', error);
                    return {
                        ...message,
                        content: "⚠️ This message cannot be decrypted. The encryption key might have changed.",
                        timestamp: DateFormatService.createDateWithTimezone(message.timestamp),
                        decryptionFailed: true
                    };
                }
            })
        );
    }

    /**
     * Send a message
     * @param senderId Sender user ID
     * @param receiverId Receiver user ID
     * @param content Message content
     * @param token JWT token
     * @returns The sent message
     */
    public async sendMessage(senderId: number, receiverId: number, content: string, token: string): Promise<IMessage> {
        const receiver: User = await this.getUserById(receiverId, token);
        const sender: AuthenticatedUser | null = storageService.getUser();

        if (!sender) {
            throw new Error('User not found in storage');
        }

        if (!sender.private_key) {
            console.error('No private key found. Unable to encrypt messages.');

            const data = await this.fetchApi<any>(`${this.baseUrl}/message/${senderId}/${receiverId}`, {
                method: 'POST',
                body: JSON.stringify({
                    content: "⚠️ Message could not be encrypted. Private key is missing.",
                    nonce: "error"
                })
            }, token);
            
            return {
                ...data,
                content: "⚠️ Message could not be encrypted. Private key is missing.",
                timestamp: DateFormatService.createDateWithTimezone(data.timestamp)
            };
        }

        try {
            const { encryptedContentBase64, nonceBase64 } = await encryptionService.encryptMessage(sender, receiver, content);

            const data = await this.fetchApi<any>(`${this.baseUrl}/message/${senderId}/${receiverId}`, {
                method: 'POST',
                body: JSON.stringify({
                    content: encryptedContentBase64,
                    nonce: nonceBase64
                })
            }, token);

            return {
                ...data,
                timestamp: DateFormatService.createDateWithTimezone(data.timestamp)
            };
        } catch (error) {
            console.error('Failed to encrypt or send message:', error);
            
            const data = await this.fetchApi<any>(`${this.baseUrl}/message/${senderId}/${receiverId}`, {
                method: 'POST',
                body: JSON.stringify({
                    content: "⚠️ Message could not be encrypted. Encryption failed.",
                    nonce: "error"
                })
            }, token);
            
            return {
                ...data,
                content: "⚠️ Message could not be encrypted. Encryption failed.",
                timestamp: DateFormatService.createDateWithTimezone(data.timestamp)
            };
        }
    }

    /**
     * Generate new encryption keys and update user's public key on the server
     * @param uid User ID
     * @param token JWT token
     * @returns Updated user data
     */
    public async regenerateKeys(uid: number, token: string): Promise<AuthenticatedUser> {
        const { publicKey, privateKey } = await encryptionService.generateKeyPair();
        
        const data = await this.updatePublicKey(uid, publicKey, token);
        
        const updatedUser: AuthenticatedUser = {
            ...data,
            private_key: privateKey
        };
        
        return updatedUser;
    }
}

export const apiService = new ApiService();
