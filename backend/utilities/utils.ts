import { DbSession } from '../db';
import { StatusCodes } from 'http-status-codes';

export interface BaseResponse<T> {
    statusCode: number;
    data: T | null;
    error?: string;
}

export abstract class Utils {
    protected dbSession: DbSession;

    /**
     * Creates a new Utils instance
     * @param dbSession The database session to use for queries
     */
    constructor(dbSession: DbSession) {
        this.dbSession = dbSession;
    }

    /**
     * Validates if a user ID is in the correct format
     * @param uid The user ID to validate
     * @returns True if valid, false otherwise
     */
    public isValidUserId(uid: number): boolean {
        return !isNaN(uid) && uid > 0 && Number.isInteger(uid);
    }

    /**
     * Checks if the user exists in the database
     * @param uid The user ID to check
     * @returns True if the user exists, false otherwise
     */
    public async userExists(uid: number): Promise<boolean> {
        const result = await this.dbSession.query('SELECT 1 FROM "user" WHERE uid = $1', [uid]);
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Creates a standardized error response
     * @param statusCode HTTP status code
     * @param errorMessage Error message
     * @returns A BaseResponse object with error details
     */
    protected createErrorResponse<T>(statusCode: number, errorMessage: string): BaseResponse<T> {
        return {
            statusCode,
            data: null,
            error: errorMessage
        };
    }

    /**
     * Creates a standardized success response
     * @param data The data to include in the response
     * @returns A BaseResponse object with the data
     */
    protected createSuccessResponse<T>(data: T, statusCode: number = StatusCodes.OK): BaseResponse<T> {
        return {
            statusCode,
            data
        };
    }

    /**
     * Validates a string against length and pattern requirements
     * @param value The string to validate
     * @param minLength Minimum allowed length
     * @param maxLength Maximum allowed length
     * @param pattern Optional regex pattern to validate against
     * @returns True if valid, false otherwise
     */
    protected isValidString(value: string, minLength: number, maxLength: number, pattern?: RegExp): boolean {
        if (!value || typeof value !== 'string') { return false; }
        if (value.length < minLength || value.length > maxLength) { return false; }
        if (pattern && !pattern.test(value)) { return false; }
        return true;
    }
}