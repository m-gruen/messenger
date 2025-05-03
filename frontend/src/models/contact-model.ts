export enum ContactStatus {
    INCOMING_REQUEST = 'incoming_request',
    OUTGOING_REQUEST = 'outgoing_request',
    ACCEPTED = 'accepted',
    REJECTED = 'rejected',
    BLOCKED = 'blocked',
    DELETED = 'deleted'
}

export interface Contact {
    contactId: number;
    userId: number;
    contactUserId: number;
    username: string;
    display_name?: string;
    status: ContactStatus;
    createdAt: Date;
}
