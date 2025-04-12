export interface IMessage {
   mid: number;
   sender_uid: number;
   receiver_uid: number;
   content: string;
   timestamp: Date;
}
