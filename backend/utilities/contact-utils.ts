import { DbSession } from '../db';
import { User } from '../models/user-model';
import { StatusCodes } from 'http-status-codes';

export interface ContactsResponse {
  statusCode: number;
  data: User[] | null;
  message?: string;
}

/**
 * Gets the contacts of the User which ID was provided
 * @param ID The ID of the given User (must be already validated)
 * @returns A ContactsResponse object containing statusCode, data, and optional error message
 */
export async function getContacts(ID: number): Promise<ContactsResponse> {
   const db = await DbSession.create(true); 
   try {
      const userQuery = `SELECT uid FROM "user" WHERE uid = $1`;
      const userResult = await db.query(userQuery, [ID]);

      if (userResult.rows.length === 0) {
         return {
            statusCode: StatusCodes.NOT_FOUND,
            data: null,
            message: 'User was not found'
         };
      }

      const contactsQuery = `
         SELECT DISTINCT u.uid, u.username, u.created_at 
         FROM "user" u
         INNER JOIN "message" m 
            ON m.sender_uid = u.uid OR m.receiver_uid = u.uid
         WHERE $1 IN (m.sender_uid, m.receiver_uid) 
            AND u.uid != $1
         ORDER BY u.username ASC
      `;
      
      const contactsResult = await db.query(contactsQuery, [ID]);

      const contacts = contactsResult.rows.map(row => ({
         uid: row.uid,
         username: row.username,
         created_at: row.created_at
      }));

      return {
         statusCode: StatusCodes.OK,
         data: contacts
      };

   } catch (error) {
      return {
         statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
         data: null,
         message: 'An error occurred while fetching contacts'
      };
   } finally {
      await db.complete();
   }
}
