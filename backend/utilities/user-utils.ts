import { DbSession } from '../db';
import { User } from '../models/user-model';
import { StatusCodes } from 'http-status-codes';
import argon2 from '@node-rs/argon2';
import { Utils, BaseResponse } from './utils';
import { JwtUtils } from './jwt-utils';

export type UserResponse = BaseResponse<User>;

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
     * @returns A UserResponse object containing statusCode, data, and optional error message
     */
    public async createUser(username: string, password: string): Promise<UserResponse> {
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

        const hashedPassword = await this.hashPassword(password);
        const result = await this.dbSession.query(`
            INSERT INTO account (username, password_hash)
            VALUES ($1, $2) 
            RETURNING uid, username, created_at`,
            [username, hashedPassword]
        );

        if (result.rowCount === 0) {
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'Failed to create user'
            );
        }

        const user: User = result.rows[0];
        return this.createSuccessResponse(user, StatusCodes.CREATED);
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

        const result = await this.dbSession.query(`
            SELECT uid, username, created_at 
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

        const user: User = result.rows[0];
        return this.createSuccessResponse(user);
    }

    /**
     * Login a user and generate JWT token
     */
    async loginUser(username: string, password: string): Promise<UserResponse> {
        try {
            const query = `SELECT uid, username, password_hash, created_at FROM account WHERE username = $1`;
            const result = await this.dbSession.query(query, [username]);

            if (result.rows.length === 0) {
                return {
                    statusCode: StatusCodes.UNAUTHORIZED,
                    data: null,
                    error: "Invalid username or password"
                };
            }

            const user = result.rows[0];
            const passwordValid = await this.verifyPassword(user.password_hash, password);

            if (!passwordValid) {
                return {
                    statusCode: StatusCodes.UNAUTHORIZED,
                    data: null,
                    error: "Invalid username or password"
                };
            }

            const token = JwtUtils.generateToken({
                uid: user.uid,
                username: user.username
            });

            return {
                statusCode: StatusCodes.OK,
                data: {
                    uid: user.uid,
                    username: user.username,
                    created_at: user.created_at,
                    token: token
                }
            };
        } catch (error) {
            console.error('Error during login:', error);
            return {
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                error: "Failed to process login request"
            };
        }
    }
}
