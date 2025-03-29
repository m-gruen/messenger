import { DbSession } from '../db';
import { User } from '../models/user-model';
import { StatusCodes } from 'http-status-codes';
import { Utils, BaseResponse } from './utils';

export type ContactsResponse = BaseResponse<User[]>;

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
         SELECT DISTINCT a.uid, a.username, a.created_at 
         FROM account a
         INNER JOIN message m 
            ON (m.sender_uid = a.uid OR m.receiver_uid = a.uid)
         WHERE $1 IN (m.sender_uid, m.receiver_uid) 
           AND a.uid != $1
         ORDER BY a.username ASC`,
         [uid]
     );

      const contacts: User[] = contactsResult.rows.map(row => ({
         uid: row.uid,
         username: row.username,
         created_at: row.created_at
      }));

      return this.createSuccessResponse(contacts);
   }
}
