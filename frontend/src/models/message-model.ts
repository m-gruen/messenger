export interface IMessage {
    mid: number;
    sender_uid: number;
    receiver_uid: number;
    content: string;
    nonce: string;
    timestamp: Date;
}

export type MessageContentType = "text" | "image";

export interface IMessageContent {
    type: MessageContentType;
    content: string;
}

export interface IImageMessageContent extends IMessageContent {
    type: "image";
    format: string; 
    content: string; 
}

export interface ITextMessageContent extends IMessageContent {
    type: "text";
    content: string;
}

export interface IConversationStore {
    lastUpdated: string;
    messages: IMessage[];
}

export interface IUserMessagesStore {
    [contactUserId: string]: IConversationStore;
}

export interface ILocalMessagesStore {
    [userId: string]: IUserMessagesStore;
}

