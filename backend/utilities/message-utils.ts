import { IMessage } from "../models/message-model";
import { BaseResponse, Utils } from "./utils";

export type MessageResponse = BaseResponse<IMessage[]>

export class MessageUtils extends Utils{

   /**
    * 
    */
   public async fetchMessage(sender_uid: number,receiver_uid: number) : Promise<MessageResponse> {
         
      
      return null!;
   }
}