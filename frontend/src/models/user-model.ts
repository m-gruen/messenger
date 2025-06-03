export interface AuthenticatedUser {
    uid: number;
    username: string;
    created_at: Date;
    display_name?: string;
    is_deleted?: boolean;
    shadow_mode?: boolean;
    full_name_search?: boolean;
    // Note: private_key is no longer coming from the server
    // but will be added to the model in local storage
    public_key: string;
    token: string;
    private_key?: string; // Optional because it's not returned from the server
}

export interface User {
    uid: number;
    username: string;
    display_name?: string;
    created_at: Date;
    public_key: string;
}
