import { StatusCodes } from "http-status-codes";
import { IMessage } from "../models/message-model";
import { BaseResponse, Utils } from "./utils";

export type MessageResponse = BaseResponse<IMessage[]>

export class MessageUtils extends Utils {

   /**
    * Fetches messages between two users
    * @param sender_uid The ID of the sender
    * @param receiver_uid The ID of the receiver
    * @returns A MessageResponse object containing statusCode, data, and optional error message
    */
   public async fetchMessage(sender_uid: number, receiver_uid: number): Promise<MessageResponse> {

      if (!this.isValidUserId(sender_uid) || !this.isValidUserId(receiver_uid)) {
         return this.createErrorResponse(
            StatusCodes.BAD_REQUEST,
            'Invalid UID'
         );
      }

      if (!this.userExists(sender_uid) || !this.userExists(receiver_uid)) {
         return this.createErrorResponse(
            StatusCodes.NOT_FOUND,
            'User not found'
         );
      }

      const db = this.dbSession;

      const messageResult = await this.dbSession.query(`
         SELECT m.mid, m.sender_uid, m.receiver_uid, m.content, m.timestamp
         FROM message m
         WHERE (m.sender_uid = $1 AND m.receiver_uid = $2) 
            OR (m.sender_uid = $2 AND m.receiver_uid = $1)
         ORDER BY m.timestamp ASC`,
         [sender_uid, receiver_uid]
      );

      const messages: IMessage[] = messageResult.rows.map(row => ({
         mid: row.mind,
         sender_uid: row.sender_uid,
         receiver_uid: row.receiver_uid,
         content: row.content,
         timestamp: row.created_at
      }));

      return this.createSuccessResponse(messages);
   }
}
