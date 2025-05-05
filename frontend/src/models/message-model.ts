export interface IMessage {
    mid: number;
    sender_uid: number;
    receiver_uid: number;
    content: string;
    timestamp: Date;
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

