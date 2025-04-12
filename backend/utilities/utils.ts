import { DbSession } from '../db';
import { StatusCodes } from 'http-status-codes';
import { ContactStatus } from '../models/contact-model';

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
        const result = await this.dbSession.query(`
            SELECT 1 
            FROM account 
            WHERE uid = $1`,
            [uid]
        );
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Checks if a user has a contact relationship with another user
     * @param sender_uid The first user's ID
     * @param receiver_uid The second user's ID
     * @returns True if a contact relationship exists, false otherwise
     */
    public async hasContactWith(sender_uid: number, receiver_uid: number): Promise<boolean> {
        const result = await this.dbSession.query(`
        SELECT contact_id
        FROM contact 
        WHERE (user_id = $1 AND contact_user_id = $2)`,
            [sender_uid, receiver_uid]
        );
        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Checks if a user can send messages to another user
     * @param sender_uid The sender's user ID
     * @param receiver_uid The receiver's user ID
     * @returns True if the user can send messages, false otherwise
     */
    public async canSendMessage(sender_uid: number, receiver_uid: number): Promise<boolean> {
        const result = await this.dbSession.query(`
        SELECT contact_id
        FROM contact 
        WHERE (user_id = $1 AND contact_user_id = $2)
        AND (status = $3 OR status = $4 OR status = $5 OR status = $6)`,
            [sender_uid, receiver_uid, ContactStatus.BLOCKED, ContactStatus.INCOMING_REQUEST, ContactStatus.OUTGOING_REQUEST, ContactStatus.DELETED]
        );
        return (result.rowCount ?? 0) === 0;
    }

    /**
     * @deprecated Use canSendMessage instead
     * Checks if the user is blocked or not accepted
     * @param sender_uid The sender's user ID
     * @param receiver_uid The receiver's user ID
     * @returns True if the user is blocked or has a pending request
     */
    public async isUserBlocked(sender_uid: number, receiver_uid: number): Promise<boolean> {
        return !(await this.canSendMessage(sender_uid, receiver_uid));
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
     * @param minLength Optional minimum allowed length
     * @param maxLength Optional maximum allowed length
     * @param pattern Optional regex pattern to validate against
     * @returns True if valid, false otherwise
     */
    protected isValidString(value: string, minLength?: number, maxLength?: number, pattern?: RegExp): boolean {
        if (!value || typeof value !== 'string') {
            return false;
        }

        if (minLength !== undefined && value.length < minLength) {
            return false;
        }

        if (maxLength !== undefined && value.length > maxLength) {
            return false;
        }

        if (pattern && !pattern.test(value)) {
            return false;
        }

        return true;
    }
}
