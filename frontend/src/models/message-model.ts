export interface IMessage {
    mid: number;
    sender_uid: number;
    receiver_uid: number;
    content: string;
    nonce: string;
    timestamp: Date;
}

export type MessageContentType = "text" | "image" | "document" | "audio" | "code";

export interface IReplyInfo {
    mid: number;
    preview: string;
    sender_uid: number;
    type: MessageContentType;
}

export interface IMessageContent {
    type: MessageContentType;
    content: string;
    replyTo?: IReplyInfo;
}

export interface IImageMessageContent extends IMessageContent {
    type: "image";
    format: string;
    content: string;
    name: string;
    size: number;
}

export interface ICodeMessageContent extends IMessageContent {
    type: "code";
    language: string;
    content: string;
    name: string;
    size: number;
}

export interface IDocumentMessageContent extends IMessageContent {
    type: "document";
    format: string;
    content: string;
    name: string;
    size: number;
}

export interface IAudioMessageContent extends IMessageContent {
    type: "audio";
    format: string;
    content: string;
    duration?: number;
    name?: string;
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
