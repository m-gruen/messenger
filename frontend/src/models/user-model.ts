export interface AuthenticatedUser {
    uid: number;
    username: string;
    created_at: Date;
    token: string;
}

export interface User {
    uid: number;
    username: string;
    created_at: Date;
}
