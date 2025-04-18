import type { AuthenticatedUser } from '@/models/user-model';

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
            if (user.created_at) {
                sessionStorage.setItem('created_at', new Date(user.created_at).toISOString());
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

                if (uid && username && token) {
                    user = {
                        uid: Number(uid),
                        username,
                        created_at: created_at ? new Date(created_at) : new Date(),
                        token
                    };
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
    }
}

export const storageService = new StorageService();
