/**
 * Interface representing a message in the database
 */
export interface IMessage {
   mid: number; // Serial primary key
   sender_uid: number; // User ID of the sender
   receiver_uid: number; // User ID of the receiver
   content: string; // Content of the message
   timestamp: Date; // Timestamp when the message was sent
}

