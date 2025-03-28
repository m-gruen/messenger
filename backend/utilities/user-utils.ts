import { DbSession } from '../db';
import { User } from '../models/user-model';
import { StatusCodes } from 'http-status-codes';
import argon2 from '@node-rs/argon2';

export interface UserResponse {
  statusCode: number;
  data: User | null;
  error?: string;
}

const passwordOptions = {
    memoryCost: 2 ** 16,
    timeCost: 4,
    outputLen: 32,
    parallelism: 2,
    algorithm: argon2.Algorithm.Argon2id,
};

export async function hashPassword(password: string): Promise<string> {
    try {
        return await argon2.hash(password, passwordOptions);
    } catch (error) {
        console.error('Password hashing error:', error);
        throw new Error(`Error hashing password: ${error}`);
    }
}

export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
    try {
        return await argon2.verify(hashed, password, passwordOptions);
    } catch (error) {
        console.error('Password verification error:', error);
        throw new Error(`Error verifying password: ${error}`);
    }
}

export async function createUser(username: string, password: string): Promise<UserResponse> {
    if (!username || typeof username !== 'string' || username.length < 3 || username.length > 20) {
        return {
            statusCode: StatusCodes.BAD_REQUEST,
            data: null,
            error: 'Username must be valid string between 3 and 20 characters'
        };
    }

    if (!password || typeof password !== 'string') {
        return {
            statusCode: StatusCodes.BAD_REQUEST,
            data: null,
            error: 'Password must be valid string'
        };
    }

    if (!(/^[a-zA-Z0-9_]+$/.test(username))) {
        return {
            statusCode: StatusCodes.BAD_REQUEST,
            data: null,
            error: 'Username can only contain letters, numbers, and underscores'
        };
    }

    const dbSession = await DbSession.create(false);
    
    try {
        const hashedPassword = await hashPassword(password);
        const result = await dbSession.query(
            'INSERT INTO "user" (username, password_hash) VALUES ($1, $2) RETURNING uid, username, created_at',
            [username, hashedPassword]
        );

        if (result.rowCount === 0) {
            await dbSession.complete(false);
            return {
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
                data: null,
                error: 'Failed to create user'
            };
        }

        const user: User = result.rows[0];
        await dbSession.complete(true);
        
        return {
            statusCode: StatusCodes.CREATED,
            data: user
        };
    } catch (error) {
        await dbSession.complete(false);
        console.error('Error in createUser:', error);
        return {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            error: 'Internal server error occurred while creating user'
        };
    }
}

export async function getUserById(uid: number): Promise<UserResponse> {
    if (isNaN(uid) || uid < 0 || !Number.isInteger(uid)) {
        return {
            statusCode: StatusCodes.BAD_REQUEST,
            data: null,
            error: 'Invalid user ID'
        };
    }

    const dbSession = await DbSession.create(true);
    
    try {
        const result = await dbSession.query(
            'SELECT "uid", "username", "created_at" FROM "user" WHERE uid = $1',
            [uid]
        );

        if (result.rowCount === 0) {
            return {
                statusCode: StatusCodes.NOT_FOUND,
                data: null,
                error: 'User not found'
            };
        }

        const user: User = result.rows[0];
        
        return {
            statusCode: StatusCodes.OK,
            data: user
        };
    } catch (error) {
        console.error('Error in getUserById:', error);
        return {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            data: null,
            error: 'Internal server error occurred while fetching user'
        };
    } finally {
        await dbSession.complete();
    }
}
