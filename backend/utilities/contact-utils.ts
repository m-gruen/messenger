import { Contact, ContactStatus } from "../models/contact-model";
import { StatusCodes } from 'http-status-codes';
import { Utils, BaseResponse } from './utils';

export type ContactsResponse = BaseResponse<Contact[]>;

export class ContactUtils extends Utils {
    /**
     * Gets the contacts of the User which ID was provided
     * @param uid The ID of the given User
     * @returns A ContactsResponse object containing statusCode, data, and optional error message
     */
    public async getContacts(uid: number): Promise<ContactsResponse> {
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
            const contactsResult = await this.dbSession.query(`
            SELECT c.contact_id, a.uid, a.username, a.created_at, c.status
            FROM contact c
            JOIN account a ON c.contact_user_id = a.uid
            WHERE c.user_id = $1
            ORDER BY a.username ASC`,
                [uid]
            );

            const contacts: Contact[] = contactsResult.rows.map(row => ({
                contactId: row.contact_id,
                userId: uid,
                contactUserId: row.uid,
                username: row.username,
                createdAt: row.created_at,
                status: row.status
            }));

            return this.createSuccessResponse(contacts);
        } catch (error) {
            console.error('Error fetching contacts:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                'Failed to fetch contacts.'
            );
        }
    }

    /**
     * Adds a new contact for the user
     * @param userId The ID of the user adding the contact
     * @param contactUserId The ID of the user to add as a contact
     * @returns A BaseResponse indicating success or failure
     */
    public async addContact(userId: number, contactUserId: number): Promise<BaseResponse<null>> {
        if (!this.isValidUserId(userId) || !this.isValidUserId(contactUserId)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        if (userId === contactUserId) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Cannot add yourself as a contact'
            );
        }

        const userExists = await this.userExists(userId);
        const contactExists = await this.userExists(contactUserId);

        if (!userExists || !contactExists) {
            return this.createErrorResponse(
                StatusCodes.NOT_FOUND,
                'User not found'
            );
        }

        try {
            const existingContact = await this.dbSession.query(
                'SELECT contact_id FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                [userId, contactUserId]
            );

            if ((existingContact.rowCount ?? 0) > 0) {
                return this.createErrorResponse(
                    StatusCodes.CONFLICT,
                    'Contact already exists'
                );
            }

            await this.dbSession.query(
                `INSERT INTO contact (user_id, contact_user_id, status)
            VALUES ($1, $2, $3)`,
                [userId, contactUserId, ContactStatus.OUTGOING_REQUEST]
            );

            await this.dbSession.query(
                `INSERT INTO contact (user_id, contact_user_id, status)
            VALUES ($1, $2, $3)`,
                [contactUserId, userId, ContactStatus.INCOMING_REQUEST]
            );

            return this.createSuccessResponse(null, StatusCodes.CREATED);

        } catch (error) {
            console.error('Error adding contact:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Failed to add contact.`
            );
        }
    }

    /**
     * Updates the contact status to blocked or accepted
     * @param userId The ID of the user
     * @param contactUserId The ID of the contact to update
     * @param blocked Whether to block the contact (true) or unblock (false)
     * @returns A BaseResponse indicating success or failure
     */
    public async updateContactBlockStatus(userId: number, contactUserId: number, blocked: boolean): Promise<BaseResponse<null>> {
        if (!this.isValidUserId(userId) || !this.isValidUserId(contactUserId)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        if (userId === contactUserId) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Cannot block or unblock yourself'
            );
        }

        const userExists = await this.userExists(userId);
        const contactExists = await this.userExists(contactUserId);

        if (!userExists || !contactExists) {
            return this.createErrorResponse(
                StatusCodes.NOT_FOUND,
                'User not found'
            );
        }

        try {
            const contactQuery = await this.dbSession.query(
                'SELECT status FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                [userId, contactUserId]
            );

            if (contactQuery.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.NOT_FOUND,
                    'Contact not found'
                );
            }

            const currentStatus = contactQuery.rows[0].status;

            if (blocked && currentStatus === ContactStatus.BLOCKED) {
                return this.createSuccessResponse(null);
            }

            if (blocked && currentStatus !== ContactStatus.ACCEPTED) {
                return this.createErrorResponse(
                    StatusCodes.BAD_REQUEST,
                    'Only accepted contacts can be blocked'
                );
            }

            if (!blocked && currentStatus !== ContactStatus.BLOCKED) {
                return this.createSuccessResponse(null);
            }

            const newStatus = blocked ? ContactStatus.BLOCKED : ContactStatus.ACCEPTED;

            await this.dbSession.query(
                `UPDATE contact
          SET status = $3
          WHERE user_id = $1 AND contact_user_id = $2`,
                [userId, contactUserId, newStatus]
            );

            return this.createSuccessResponse(null);
        } catch (error) {
            console.error('Error updating contact block status:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Failed to update contact.`
            );
        }
    }

    /**
     * Deletes a contact relationship for the requesting user and marks it as deleted for the other user
     * @param userId The ID of the user requesting deletion
     * @param contactUserId The ID of the contact to delete
     * @returns A BaseResponse indicating success or failure
     */
    public async deleteContact(userId: number, contactUserId: number): Promise<BaseResponse<null>> {
        if (!this.isValidUserId(userId) || !this.isValidUserId(contactUserId)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        if (userId === contactUserId) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Cannot delete yourself as a contact'
            );
        }

        const userExists = await this.userExists(userId);
        const contactExists = await this.userExists(contactUserId);

        if (!userExists || !contactExists) {
            return this.createErrorResponse(
                StatusCodes.NOT_FOUND,
                'User not found'
            );
        }

        try {
            const contactQuery = await this.dbSession.query(
                'SELECT contact_id, status FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                [userId, contactUserId]
            );

            if (contactQuery.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.NOT_FOUND,
                    'Contact not found'
                );
            }

            const contactStatus = contactQuery.rows && contactQuery.rows[0] && contactQuery.rows[0].status
                ? contactQuery.rows[0].status
                : '';

            await this.dbSession.query(
                'DELETE FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                [userId, contactUserId]
            );

            const reverseContactQuery = await this.dbSession.query(
                'SELECT contact_id, status FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                [contactUserId, userId]
            );

            if (reverseContactQuery && reverseContactQuery.rowCount && reverseContactQuery.rowCount > 0) {
                const reverseStatus = reverseContactQuery.rows && reverseContactQuery.rows[0] && reverseContactQuery.rows[0].status
                    ? reverseContactQuery.rows[0].status
                    : '';

                if (contactStatus === ContactStatus.OUTGOING_REQUEST &&
                    reverseStatus === ContactStatus.INCOMING_REQUEST) {
                    await this.dbSession.query(
                        'DELETE FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                        [contactUserId, userId]
                    );
                } else {
                    await this.dbSession.query(
                        `UPDATE contact 
                  SET status = $3
                  WHERE user_id = $1 AND contact_user_id = $2`,
                        [contactUserId, userId, ContactStatus.DELETED]
                    );
                }
            } else {
                if (contactStatus === ContactStatus.OUTGOING_REQUEST) {
                    await this.dbSession.query(
                        'DELETE FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                        [contactUserId, userId]
                    );
                } else {
                    await this.dbSession.query(
                        `UPDATE contact 
                  SET status = $3
                  WHERE user_id = $1 AND contact_user_id = $2`,
                        [contactUserId, userId, ContactStatus.DELETED]
                    );
                }
            }

            return this.createSuccessResponse(null);
        } catch (error) {
            console.error('Error deleting contact:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Failed to delete contact relationship.`
            );
        }
    }

    /**
     * Deletes a contact relationship by contact ID
     * @param contactId The ID of the contact to delete
     * @returns A BaseResponse indicating success or failure
     */
    public async deleteContactViaContactId(contactId: number): Promise<BaseResponse<null>> {
        if (!this.isValidContactId(contactId)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid contact ID'
            );
        }

        try {
            const contactQuery = await this.dbSession.query(
                'SELECT user_id, contact_user_id FROM contact WHERE contact_id = $1',
                [contactId]
            );

            if (contactQuery.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.NOT_FOUND,
                    'Contact not found'
                );
            }

            const user_id = contactQuery.rows?.[0]?.user_id ?? 0;
            const contact_user_id = contactQuery.rows?.[0]?.contact_user_id ?? 0;

            const contactStatusQuery = await this.dbSession.query(
                'SELECT status FROM contact WHERE contact_id = $1',
                [contactId]
            );

            const contactStatus = contactStatusQuery.rows?.[0]?.status || '';

            await this.dbSession.query(
                'DELETE FROM contact WHERE contact_id = $1',
                [contactId]
            );

            if (user_id && contact_user_id) {
                const reverseContactQuery = await this.dbSession.query(
                    'SELECT contact_id, status FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                    [contact_user_id, user_id]
                );

                if ((reverseContactQuery.rowCount ?? 0) > 0) {
                    const reverseStatus = reverseContactQuery.rows?.[0]?.status || '';

                    if ((contactStatus === ContactStatus.OUTGOING_REQUEST || contactStatus === '') &&
                        (reverseStatus === ContactStatus.INCOMING_REQUEST || reverseStatus === '')) {
                        await this.dbSession.query(
                            'DELETE FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                            [contact_user_id, user_id]
                        );
                    } else {
                        await this.dbSession.query(`
                  UPDATE contact 
                  SET status = $3
                  WHERE user_id = $1 AND contact_user_id = $2`,
                            [contact_user_id, user_id, ContactStatus.DELETED]
                        );
                    }
                } else {
                    if (contactStatus === ContactStatus.OUTGOING_REQUEST) {
                        await this.dbSession.query(
                            'DELETE FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                            [contact_user_id, user_id]
                        );
                    } else {
                        await this.dbSession.query(`
                  UPDATE contact 
                  SET status = $3
                  WHERE user_id = $1 AND contact_user_id = $2`,
                            [contact_user_id, user_id, ContactStatus.DELETED]
                        );
                    }
                }
            }

            return this.createSuccessResponse(null);
        } catch (error) {
            console.error('Error deleting contact:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Failed to delete contact relationship.`
            );
        }
    }

    /**
     * Gets all incoming contact requests for a user
     * @param userId The ID of the user
     * @returns A ContactsResponse object containing incoming requests
     */
    public async getIncomingRequests(userId: number): Promise<ContactsResponse> {
        if (!this.isValidUserId(userId)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        const userExists = await this.userExists(userId);
        if (!userExists) {
            return this.createErrorResponse(
                StatusCodes.NOT_FOUND,
                'User not found'
            );
        }

        try {
            const requestsResult = await this.dbSession.query(`
            SELECT a.uid, a.username, a.created_at, c.status, c.contact_id
            FROM contact c
            JOIN account a ON c.contact_user_id = a.uid
            WHERE c.user_id = $1 AND c.status = $2
            ORDER BY a.username ASC`,
                [userId, ContactStatus.INCOMING_REQUEST]
            );

            const incomingRequests: Contact[] = requestsResult.rows.map(row => ({
                contactId: row.contact_id,
                userId: userId,
                contactUserId: row.uid,
                username: row.username,
                createdAt: row.created_at,
                status: row.status
            }));

            return this.createSuccessResponse(incomingRequests);
        } catch (error) {
            console.error('Error fetching incoming contact requests:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Failed to retrieve incoming contact requests.`
            );
        }
    }

    /**
     * Gets all outgoing contact requests for a user
     * @param userId The ID of the user
     * @returns A ContactsResponse object containing outgoing requests
     */
    public async getOutgoingRequests(userId: number): Promise<ContactsResponse> {
        if (!this.isValidUserId(userId)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        const userExists = await this.userExists(userId);
        if (!userExists) {
            return this.createErrorResponse(
                StatusCodes.NOT_FOUND,
                'User not found'
            );
        }

        try {
            const requestsResult = await this.dbSession.query(`
            SELECT a.uid, a.username, a.created_at, c.status, c.contact_id
            FROM contact c
            JOIN account a ON c.contact_user_id = a.uid
            WHERE c.user_id = $1 AND c.status = $2
            ORDER BY a.username ASC`,
                [userId, ContactStatus.OUTGOING_REQUEST]
            );

            const outgoingRequests: Contact[] = requestsResult.rows.map(row => ({
                contactId: row.contact_id,
                userId: userId,
                contactUserId: row.uid,
                username: row.username,
                createdAt: row.created_at,
                status: row.status
            }));

            return this.createSuccessResponse(outgoingRequests);
        } catch (error) {
            console.error('Error fetching outgoing contact requests:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Failed to retrieve outgoing contact requests.`
            );
        }
    }

    /**
     * Accepts a pending contact request
     * @param userId The ID of the user accepting the request
     * @param contactUserId The ID of the user who sent the request
     * @returns A BaseResponse indicating success or failure
     */
    public async acceptContact(userId: number, contactUserId: number): Promise<BaseResponse<null>> {
        if (!this.isValidUserId(userId) || !this.isValidUserId(contactUserId)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        if (userId === contactUserId) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Cannot accept your own contact request'
            );
        }

        const userExists = await this.userExists(userId);
        const contactExists = await this.userExists(contactUserId);
        if (!userExists || !contactExists) {
            return this.createErrorResponse(
                StatusCodes.NOT_FOUND,
                'User not found'
            );
        }

        try {
            const contactQuery = await this.dbSession.query(
                'SELECT status FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                [userId, contactUserId]
            );

            if (contactQuery.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.NOT_FOUND,
                    'Contact not found'
                );
            }

            const currentStatus = contactQuery.rows[0].status;

            if (currentStatus !== ContactStatus.INCOMING_REQUEST) {
                return this.createErrorResponse(
                    StatusCodes.BAD_REQUEST,
                    'Only incoming contact requests can be accepted'
                );
            }

            const recipientResult = await this.dbSession.query(
                `UPDATE contact
            SET status = $3
            WHERE user_id = $1 AND contact_user_id = $2 AND status = $4`,
                [userId, contactUserId, ContactStatus.ACCEPTED, ContactStatus.INCOMING_REQUEST]
            );

            const initiatorResult = await this.dbSession.query(
                `UPDATE contact
            SET status = $3
            WHERE user_id = $1 AND contact_user_id = $2 AND status = $4`,
                [contactUserId, userId, ContactStatus.ACCEPTED, ContactStatus.OUTGOING_REQUEST]
            );

            if (recipientResult.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.NOT_FOUND,
                    'No pending contact request found'
                );
            }

            return this.createSuccessResponse(null);
        } catch (error) {
            console.error('Error accepting contact request:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Failed to accept contact request.`
            );
        }
    }

    /**
     * Rejects a pending contact request
     * @param userId The ID of the user rejecting the request
     * @param contactUserId The ID of the user who sent the request
     * @returns A BaseResponse indicating success or failure
     */
    public async rejectContact(userId: number, contactUserId: number): Promise<BaseResponse<null>> {
        if (!this.isValidUserId(userId) || !this.isValidUserId(contactUserId)) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Invalid user ID'
            );
        }

        if (userId === contactUserId) {
            return this.createErrorResponse(
                StatusCodes.BAD_REQUEST,
                'Cannot reject your own contact request'
            );
        }

        const userExists = await this.userExists(userId);
        const contactExists = await this.userExists(contactUserId);

        if (!userExists || !contactExists) {
            return this.createErrorResponse(
                StatusCodes.NOT_FOUND,
                'User not found'
            );
        }

        try {
            const contactQuery = await this.dbSession.query(
                'SELECT status FROM contact WHERE user_id = $1 AND contact_user_id = $2',
                [userId, contactUserId]
            );

            if (contactQuery.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.NOT_FOUND,
                    'Contact not found'
                );
            }

            const currentStatus = contactQuery.rows[0].status;

            if (currentStatus !== ContactStatus.INCOMING_REQUEST) {
                return this.createErrorResponse(
                    StatusCodes.BAD_REQUEST,
                    'Only incoming contact requests can be rejected'
                );
            }

            const recipientResult = await this.dbSession.query(
                `UPDATE contact
            SET status = $3
            WHERE user_id = $1 AND contact_user_id = $2 AND status = $4`,
                [userId, contactUserId, ContactStatus.REJECTED, ContactStatus.INCOMING_REQUEST]
            );

            const initiatorResult = await this.dbSession.query(
                `UPDATE contact
            SET status = $3
            WHERE user_id = $1 AND contact_user_id = $2 AND status = $4`,
                [contactUserId, userId, ContactStatus.REJECTED, ContactStatus.OUTGOING_REQUEST]
            );

            if (recipientResult.rowCount === 0) {
                return this.createErrorResponse(
                    StatusCodes.NOT_FOUND,
                    'No pending contact request found'
                );
            }

            return this.createSuccessResponse(null);
        } catch (error) {
            console.error('Error rejecting contact request:', error);
            return this.createErrorResponse(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Failed to reject contact request.`
            );
        }
    }
}
