export interface IMessage {
    mid: number;
    sender_uid: number;
    receiver_uid: number;
    content: string;
    nonce: string;
    timestamp: Date;
}

export type MessageContentType = "text" | "image" | "document" | "audio";

export interface IMessageContent {
    type: MessageContentType;
    content: string;
}

export interface IImageMessageContent extends IMessageContent {
    type: "image";
    format: string; 
    content: string; 
}

export interface IDocumentMessageContent extends IMessageContent {
    type: "document";
    format: string;  // MIME type
    content: string; // Base64 encoded content
    name: string;    // Original filename
    size: number;    // File size in bytes
}

export interface IAudioMessageContent extends IMessageContent {
    type: "audio";
    format: string;  // MIME type
    content: string; // Base64 encoded content
    duration?: number; // Duration in seconds, if available
    name?: string;   // Original filename, if applicable
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

