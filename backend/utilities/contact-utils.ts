import { DbSession } from '../db';
import { User } from '../models/user-model';
import { Contact } from "../models/contact-model.js";
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

      const contactsResult = await this.dbSession.query(`
         SELECT a.uid, a.username, a.created_at, c.blocked, c.status
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
         blocked: row.blocked,
         status: row.status
      }));

      return this.createSuccessResponse(contacts);
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
            `INSERT INTO contact (user_id, contact_user_id)
            VALUES ($1, $2)`,
            [userId, contactUserId]
         );

         return this.createSuccessResponse(null, StatusCodes.CREATED);

      } catch (error) {
         return this.createErrorResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to add contact.`
         );
      }
   }

   /**
    * Updates the blocked status of a contact
    * @param userId The ID of the user
    * @param contactUserId The ID of the contact to update
    * @param blocked The new blocked status
    * @returns A BaseResponse indicating success or failure
    */
   public async updateContactBlockStatus(userId: number, contactUserId: number, blocked: boolean): Promise<BaseResponse<null>> {
      if (!this.isValidUserId(userId) || !this.isValidUserId(contactUserId)) {
         return this.createErrorResponse(
            StatusCodes.BAD_REQUEST,
            'Invalid user ID'
         );
      }

      try {
         const result = await this.dbSession.query(
            `UPDATE contact
            SET blocked = $3
            WHERE user_id = $1 AND contact_user_id = $2`,
            [userId, contactUserId, blocked]
         );

         if (result.rowCount === 0) {
            return this.createErrorResponse(
               StatusCodes.NOT_FOUND,
               'Contact not found'
            );
         }

         return this.createSuccessResponse(null);
      } catch (error) {
         return this.createErrorResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to update contact.`
         );
      }
   }

   /**
    * Deletes a contact
    * @param userId The ID of the user
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

      try {
         const result = await this.dbSession.query(
            `DELETE FROM contact
            WHERE user_id = $1 AND contact_user_id = $2`,
            [userId, contactUserId]
         );

         if (result.rowCount === 0) {
            return this.createErrorResponse(
               StatusCodes.NOT_FOUND,
               'Contact not found'
            );
         }

         return this.createSuccessResponse(null);
      } catch (error) {
         return this.createErrorResponse(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Failed to delete contact.`
         );
      }
   }
}
