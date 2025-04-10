export interface Contact {
    contactId: number;
    userId: number;
    contactUserId: number;
    status: string;
    blocked: boolean;
    createdAt: Date;
}
