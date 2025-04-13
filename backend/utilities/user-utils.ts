import { AuthenticatedUser } from '../models/user-model';
import { StatusCodes } from 'http-status-codes';
import argon2 from '@node-rs/argon2';
import { Utils, BaseResponse } from './utils';
import { JwtUtils } from './jwt-utils';
import { ContactUtils } from './contact-utils';

export type UserResponse = BaseResponse<AuthenticatedUser>;

const passwordOptions = {
    memoryCost: 2 ** 16,
    timeCost: 4,
    outputLen: 32,
    parallelism: 2,
    algorithm: argon2.Algorithm.Argon2id,
};

export class UserUtils extends Utils {
    /**
     * Hashes a password using Argon2
     * @param password The plain text password to hash
     * @returns The hashed password
     */
    public async hashPassword(password: string): Promise<string> {
        try {
            return await argon2.hash(password, passwordOptions);
        } catch (error) {
            console.error('Password hashing error:', error);
            throw new Error(`Error hashing password: ${error}`);
        }
    }

    /**
     * Verifies a password against a hash
     * @param hashed The hashed password
     * @param password The plain text password to verify
     * @returns True if the password matches the hash, false otherwise
     */
    public async verifyPassword(hashed: string, password: string): Promise<boolean> {
        try {
            return await argon2.verify(hashed, password, passwordOptions);
        } catch (error) {
            console.error('Password verification error:', error);
            throw new Error(`Error verifying password: ${error}`);
        }
    }

    /**
     * Creates a new user
     * @param username The username for the new user
     * @param password The password for the new user
     * @param displayName Optional display name for the user
     * @param shadowMode Optional flag to set shadow mode (defaults to false)
     * @param fullNameSearch Optional flag to set full name search requirement (defaults to false)
     * @returns A UserResponse object containing statusCode, data, and optional error message
     */
    public async createUser(
        username: string,
        password: string,
        displayName?: string,
        shadowMode: boolean = false,
        fullNameSearch: boolean = false
    ): Promise<UserResponse> {
        if (!this.isValidString(username, 3, 20, /^[a-zA-Z0-9_]+$/)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Username must be valid string between 3 and 20 characters and can only contain letters, numbers, and underscores'
            );
        }

        if (!this.isValidString(password)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Password must be valid string'
            );
        }

        try {
            const existingUser = await this.dbSession.query(
                `SELECT username FROM account WHERE username = $1`,
                [username]
            );

            if ((existingUser.rowCount ?? 0) > 0) {
                return this.createErrorResponse(
                    StatusCodes.CONFLICT,
                    'Username already exists'
                );
            }

            const hashedPassword = await this.hashPassword(password);
            const result = await this.dbSession.query(`
            INSERT INTO account (
                username, 
                password_hash,
                display_name,
                shadow_mode,
                full_name_search
            )
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING uid, username, created_at, display_name, is_deleted, shadow_mode, full_name_search`,
                [
                    username,
                    hashedPassword,
                    displayName || null,
                    shadowMode,
                    fullNameSearch
                ]
            );

            if (result.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    'Failed to create user'
                );
            }

            const token = JwtUtils.generateToken({
                uid: result.rows[0].uid,
                username: result.rows[0].username
            });

            const user: AuthenticatedUser = {
                uid: result.rows[0].uid,
                username: result.rows[0].username,
                created_at: result.rows[0].created_at,
                display_name: result.rows[0].display_name,
                is_deleted: result.rows[0].is_deleted,
                shadow_mode: result.rows[0].shadow_mode,
                full_name_search: result.rows[0].full_name_search,
                token: token
            };
            
            return this.createSuccessResponse(user, StatusCodes.CREATED);
        } catch (error) {
            console.error('Error creating user:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'An unexpected error occurred while creating the user.'
            );
        }
    }

    /**
     * Gets a user by their ID
     * @param uid The user ID to lookup
     * @returns A UserResponse object containing statusCode, data, and optional error message
     */
    public async getUserById(uid: number): Promise<UserResponse> {
        if (!this.isValidUserId(uid)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        try {
            const result = await this.dbSession.query(`
                SELECT uid, username, created_at, display_name, is_deleted, shadow_mode, full_name_search
                FROM account 
                WHERE uid = $1`,
                [uid]
            );

            if (result.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.NOT_FOUND,
                    'User not found'
                );
            }

            const user: AuthenticatedUser = result.rows[0];
            return this.createSuccessResponse(user);
        } catch (error) {
            console.error('Error getting user by ID:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'An unexpected error occurred while retrieving the user.'
            );
        }
    }

    /**
     * Login a user and generate JWT token
     * @param username The username for login
     * @param password The password to verify
     * @returns A UserResponse object containing statusCode, data, and optional error message
     */
    public async loginUser(username: string, password: string): Promise<UserResponse> {
        if (!this.isValidString(username) || !this.isValidString(password)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Username and password are required'
            );
        }

        try {
            const result = await this.dbSession.query(`
                SELECT uid, username, password_hash, created_at 
                FROM account 
                WHERE username = $1`,
                [username]
            );

            if (result.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.UNAUTHORIZED,
                    'Invalid username or password'
                );
            }

            const user = result.rows[0];
            const passwordValid = await this.verifyPassword(user.password_hash, password);

            if (!passwordValid) {
                return this.createErrorResponse(
                    StatusCodes.UNAUTHORIZED,
                    'Invalid username or password'
                );
            }

            const token = JwtUtils.generateToken({
                uid: user.uid,
                username: user.username
            });

            const userData: AuthenticatedUser = {
                uid: user.uid,
                username: user.username,
                created_at: user.created_at,
                token: token
            };

            return this.createSuccessResponse(userData);
        } catch (error) {
            console.error('Error logging in user:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'An unexpected error occurred during login.'
            );
        }
    }

    /**
     * Soft deletes a user account by marking them as deleted rather than removing them
     * @param uid The user ID to delete
     * @returns A BaseResponse object containing statusCode and optional error message
     */
    public async deleteUser(uid: number): Promise<BaseResponse<null>> {
        if (!this.isValidUserId(uid)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        const userExists = await this.userExists(uid);
        if (!userExists) {
            return this.createErrorResponse(
                StatusCodes.NOT_FOUND,
                'User not found'
            );
        }

        try {
            const randomString = Math.random().toString(36).substring(2, 10);
            const deletedUsername = `Deleted User #${randomString}`;

            const result = await this.dbSession.query(`
            UPDATE account 
            SET is_deleted = TRUE, 
                username = $2, 
                display_name = NULL 
            WHERE uid = $1`,
                [uid, deletedUsername]
            );

            if (result.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    'Failed to delete user'
                );
            }

            const contactsResult = await this.dbSession.query(`
                SELECT contact_id 
                FROM contact 
                WHERE user_id = $1`,
                [uid]
            );

            const contactUtils = new ContactUtils(this.dbSession);

            for (const row of contactsResult.rows) {
                await contactUtils.deleteContactViaContactId(row.contact_id);
            }

            return this.createSuccessResponse(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'An unexpected error occurred while deleting the user.'
            );
        }
    }

    /**
     * Updates a user's information including username, password, display name, and privacy settings
     * @param uid The user ID to update
     * @param options Update options including username, password, display name, and privacy settings
     * @returns A UserResponse object containing statusCode, data, and optional error message
     */
    public async updateUser(
        uid: number,
        options: {
            username?: string;
            password?: string;
            displayName?: string | null;
            shadowMode?: boolean;
            fullNameSearch?: boolean;
        }
    ): Promise<UserResponse> {
        if (!this.isValidUserId(uid)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        const { username, password, displayName, shadowMode, fullNameSearch } = options;

        try {
            const userQuery = await this.dbSession.query(
                `SELECT uid, is_deleted FROM account WHERE uid = $1`,
                [uid]
            );

            if (userQuery.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.NOT_FOUND,
                    'User not found'
                );
            }

            if (userQuery.rows[0].is_deleted) {
                return this.createErrorResponse(
                    StatusCodes.FORBIDDEN,
                    'Cannot update deleted user'
                );
            }

            if (username !== undefined) {
                if (!this.isValidString(username, 3, 20, /^[a-zA-Z0-9_]+$/)) {
                    return this.createErrorResponse(
                        StatusCodes.BAD_REQUEST,
                        'Username must be valid string between 3 and 20 characters and can only contain letters, numbers, and underscores'
                    );
                }

                const existingUser = await this.dbSession.query(
                    `SELECT username FROM account WHERE username = $1 AND uid != $2`,
                    [username, uid]
                );

                if ((existingUser.rowCount ?? 0) > 0) {
                    return this.createErrorResponse(
                        StatusCodes.CONFLICT,
                        'Username already exists'
                    );
                }
            }

            if (password !== undefined && !this.isValidString(password)) {
                return this.createErrorResponse(
                    StatusCodes.BAD_REQUEST,
                    'Password must be valid string'
                );
            }

            if (displayName !== undefined && displayName !== null && !this.isValidString(displayName, 1, 100)) {
                return this.createErrorResponse(
                    StatusCodes.BAD_REQUEST,
                    'Display name must be a valid string between 1 and 100 characters'
                );
            }

            let updateQuery = 'UPDATE account SET';
            const updateParams: any[] = [];
            const updateFields: string[] = [];

            if (username !== undefined) {
                updateParams.push(username);
                updateFields.push(`username = $${updateParams.length}`);
            }

            if (password !== undefined) {
                const hashedPassword = await this.hashPassword(password);
                updateParams.push(hashedPassword);
                updateFields.push(`password_hash = $${updateParams.length}`);
            }

            if (displayName !== undefined) {
                updateParams.push(displayName);
                updateFields.push(`display_name = $${updateParams.length}`);
            }

            if (shadowMode !== undefined) {
                updateParams.push(shadowMode);
                updateFields.push(`shadow_mode = $${updateParams.length}`);
            }

            if (fullNameSearch !== undefined) {
                updateParams.push(fullNameSearch);
                updateFields.push(`full_name_search = $${updateParams.length}`);
            }

            if (updateFields.length === 0) {
                return this.createErrorResponse(
                    StatusCodes.BAD_REQUEST,
                    'No valid fields provided for update'
                );
            }

            updateQuery += ` ${updateFields.join(', ')} 
            WHERE uid = $${updateParams.length + 1} 
            RETURNING uid, username, created_at, display_name, is_deleted, shadow_mode, full_name_search`;
            updateParams.push(uid);

            const result = await this.dbSession.query(updateQuery, updateParams);

            if (result.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    'Failed to update user'
                );
            }

            const user = result.rows[0];
            const token = JwtUtils.generateToken({
                uid: user.uid,
                username: user.username
            });

            const userData: AuthenticatedUser = {
                uid: user.uid,
                username: user.username,
                created_at: user.created_at,
                token: token,
                display_name: user.display_name,
                is_deleted: user.is_deleted,
                shadow_mode: user.shadow_mode,
                full_name_search: user.full_name_search
            };

            return this.createSuccessResponse(userData);
        } catch (error) {
            console.error('Error updating user:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'An unexpected error occurred while updating the user.'
            );
        }
    }
}
