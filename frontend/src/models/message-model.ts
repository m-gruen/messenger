export interface IMessage {
    mid: number;
    sender_uid: number;
    receiver_uid: number;
    content: string;
    timestamp: Date;
}

export interface ConversationStore {
    lastUpdated: string;
    messages: IMessage[];
}

export interface UserMessagesStore {
    [contactUserId: string]: ConversationStore;
}

export interface LocalMessagesStore {
    [userId: string]: UserMessagesStore;
}

