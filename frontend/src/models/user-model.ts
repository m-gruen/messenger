export interface AuthenticatedUser {
    uid: number;
    username: string;
    created_at: Date;
    display_name?: string;
    is_deleted?: boolean;
    shadow_mode?: boolean;
    full_name_search?: boolean;
    token: string;
}

export interface User {
    uid: number;
    username: string;
    display_name?: string;
    created_at: Date;
}
