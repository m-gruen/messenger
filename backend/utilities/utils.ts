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
        return this.isValidId(uid);
    }

    /**
     * Validates if a contact ID is in the correct format
     * @param contactId The contact ID to validate
     * @returns True if valid, false otherwise
     */
    public isValidContactId(contactId: number): boolean {
        return this.isValidId(contactId);
    }

    /**
     * Validates if an ID is in the correct format
     * @param id The id to validate
     * @returns True if valid, false otherwise
     */
    public isValidId(id: number): boolean {
        return !isNaN(id) && id > 0 && Number.isInteger(id);
    }

    /**
     * Checks if the user exists in the database
     * @param uid The user ID to check
     * @returns True if the user exists, false otherwise
     */
    public async userExists(uid: number): Promise<boolean> {
        if (!this.isValidUserId(uid)) {
            return false;
        }

        try {
            const result = await this.dbSession.query(`
                SELECT 1 
                FROM account 
                WHERE uid = $1`,
                [uid]
            );
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            console.error('Error checking user existence:', error);
            return false;
        }
    }

    /**
     * Checks if a user has a contact relationship with another user
     * @param sender_uid The first user's ID
     * @param receiver_uid The second user's ID
     * @returns True if a contact relationship exists, false otherwise
     */
    public async hasContactWith(sender_uid: number, receiver_uid: number): Promise<boolean> {
        if (!this.isValidUserId(sender_uid) || !this.isValidUserId(receiver_uid)) {
            return false;
        }

        try {
            const result = await this.dbSession.query(`
                SELECT contact_id
                FROM contact 
                WHERE user_id = $1 AND contact_user_id = $2`,
                [sender_uid, receiver_uid]
            );

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            console.error('Error checking contact relationship:', error);
            return false;
        }
    }

    /**
     * Checks if a user can send messages to another user
     * @param sender_uid The sender's user ID
     * @param receiver_uid The receiver's user ID
     * @returns Object with permission status and reason if denied
     */
    public async canSendMessage(sender_uid: number, receiver_uid: number): Promise<{ canSend: boolean; reason?: string }> {
        if (!this.isValidUserId(sender_uid) || !this.isValidUserId(receiver_uid)) {
            return { canSend: false, reason: 'Invalid user ID' };
        }

        try {
            // First check if sender has blocked receiver or other non-accepted status
            const senderContactQuery = await this.dbSession.query(`
                SELECT status 
                FROM contact 
                WHERE user_id = $1 AND contact_user_id = $2`,
                [sender_uid, receiver_uid]
            );

            if (senderContactQuery.rowCount === 0) {
                return { canSend: false, reason: 'No contact relationship' };
            }

            const senderStatus = senderContactQuery.rows[0].status;

            // Check if sender has blocked the receiver
            if (senderStatus === ContactStatus.BLOCKED) {
                return { canSend: false, reason: 'you_blocked' };
            }

            if (
                senderStatus === ContactStatus.INCOMING_REQUEST ||
                senderStatus === ContactStatus.OUTGOING_REQUEST ||
                senderStatus === ContactStatus.DELETED ||
                senderStatus === ContactStatus.REJECTED
            ) {
                return { canSend: false, reason: 'Not an accepted contact' };
            }

            // Next check if receiver has blocked sender
            const receiverContactQuery = await this.dbSession.query(`
                SELECT status 
                FROM contact 
                WHERE user_id = $1 AND contact_user_id = $2`,
                [receiver_uid, sender_uid]
            );

            if (receiverContactQuery.rowCount === 0) {
                return { canSend: false, reason: 'No reverse contact relationship' };
            }

            const receiverStatus = receiverContactQuery.rows[0].status;

            // Check if receiver has blocked the sender
            if (receiverStatus === ContactStatus.BLOCKED) {
                return { canSend: false, reason: 'user_blocked' };
            }

            return { canSend: true };
        } catch (error) {
            console.error('Error checking if user can send messages:', error);
            return { canSend: false, reason: 'Error checking message permission' };
        }
    }

    /**
     * @deprecated Use canSendMessage instead
     * Checks if the user is blocked or not accepted
     * @param sender_uid The sender's user ID
     * @param receiver_uid The receiver's user ID
     * @returns True if the user is blocked or has a pending request
     */
    public async isUserBlocked(sender_uid: number, receiver_uid: number): Promise<boolean> {
        return !(await this.canSendMessage(sender_uid, receiver_uid)).canSend;
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

    /**
     * Validates if a value is a boolean or a string representation of a boolean
     * @param value The value to validate
     * @returns True if the value is a boolean or a valid string representation of a boolean
     */
    protected isValidBoolean(value: unknown): boolean {
        if (typeof value === 'boolean') {
            return true;
        }

        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            return lowerValue === 'true' || lowerValue === 'false';
        }

        return false;
    }
}
