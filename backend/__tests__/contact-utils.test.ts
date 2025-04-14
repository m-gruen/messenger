import { ContactUtils } from '../utilities/contact-utils';
import { DbSession } from '../db';
import { StatusCodes } from 'http-status-codes';
import { ContactStatus } from '../models/contact-model';

describe('ContactUtils', () => {
    let dbSessionMock: DbSession;
    let contactUtils: ContactUtils;

    beforeEach(() => {
        dbSessionMock = {
            query: jest.fn()
        } as unknown as DbSession;

        contactUtils = new ContactUtils(dbSessionMock);
    });

    describe('getContacts', () => {
        it('should return an error response for invalid user ID', async () => {
            const result = await contactUtils.getContacts(-1);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid user ID');
        });

        it('should return an error response if user does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await contactUtils.getContacts(1);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an empty list if the user has no contacts', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({ rows: [] }); // No contacts

            const result = await contactUtils.getContacts(1);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toEqual([]);
        });

        it('should return a success response with contacts', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({
                    rows: [
                        { contact_id: 1, uid: 2, username: 'John', created_at: '2023-01-01', status: ContactStatus.ACCEPTED }
                    ]
                });

            const result = await contactUtils.getContacts(1);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toEqual([
                { contactId: 1, userId: 1, contactUserId: 2, username: 'John', createdAt: '2023-01-01', status: ContactStatus.ACCEPTED }
            ]);
        });
    });

    describe('addContact', () => {
        it('should return an error response for invalid user IDs', async () => {
            const result = await contactUtils.addContact(-1, 2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid user ID');
        });

        it('should return an error response if user tries to add themselves', async () => {
            const result = await contactUtils.addContact(1, 1);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Cannot add yourself as a contact');
        });

        it('should return an error response if either user does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await contactUtils.addContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an error response if contact already exists', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1 }); // existing contact

            const result = await contactUtils.addContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.CONFLICT);
            expect(result.error).toBe('Contact already exists');
        });

        it('should add a new contact and return a success response', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 0 }); // no existing contact

            const result = await contactUtils.addContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.CREATED);
            expect(result.data).toBeNull();
        });
    });

    describe('updateContactBlockStatus', () => {
        it('should return an error response for invalid user IDs', async () => {
            const result = await contactUtils.updateContactBlockStatus(-1, 2, true);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid user ID');
        });

        it('should return an error response if user tries to block themselves', async () => {
            const result = await contactUtils.updateContactBlockStatus(1, 1, true);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Cannot block or unblock yourself');
        });

        it('should return an error response if either user does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await contactUtils.updateContactBlockStatus(1, 2, true);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an error response if contact does not exist', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 0 }); // no existing contact
            const result = await contactUtils.updateContactBlockStatus(1, 2, true);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('Contact not found');
        });

        it('should return a success response if the contact is already blocked', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.BLOCKED }] }); // contact already blocked

            const result = await contactUtils.updateContactBlockStatus(1, 2, true);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeNull();
        });

        it('should return an error response if trying to block a non-accepted contact', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.INCOMING_REQUEST }] }); // contact not accepted

            const result = await contactUtils.updateContactBlockStatus(1, 2, true);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Only accepted contacts can be blocked');
        });

        it('should return a success response if the contact is already unblocked', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.ACCEPTED }] }); // contact already unblocked

            const result = await contactUtils.updateContactBlockStatus(1, 2, false);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeNull();
        });

        it('should update the contact status to blocked and return a success response', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.ACCEPTED }] }) // contact accepted
                .mockResolvedValueOnce({ rowCount: 1 }); // update query

            const result = await contactUtils.updateContactBlockStatus(1, 2, true);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeNull();
        });

        it('should update the contact status to accepted and return a success response', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.BLOCKED }] }) // contact blocked
                .mockResolvedValueOnce({ rowCount: 1 }); // update query

            const result = await contactUtils.updateContactBlockStatus(1, 2, false);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeNull();
        });
    });

    describe('deleteContact', () => {
        it('should return an error response for invalid user IDs', async () => {
            const result = await contactUtils.deleteContact(-1, 2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid user ID');
        });

        it('should return an error response if user tries to delete themselves', async () => {
            const result = await contactUtils.deleteContact(1, 1);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Cannot delete yourself as a contact');
        });

        it('should return an error response if user does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await contactUtils.deleteContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an error response if contact does not exist', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 0 }); // no existing contact

            const result = await contactUtils.deleteContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('Contact not found');
        });

        it('should delete the contact and return a success response', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1 }) // contact exists
                .mockResolvedValueOnce({ rowCount: 1 }) // reverse contact exists
                .mockResolvedValueOnce({ rowCount: 1 }); // update reverse contact

            const result = await contactUtils.deleteContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeNull();
        });
    });

    describe('deleteContactViaContactId', () => {
        it('should return an error response for invalid contact ID', async () => {
            const result = await contactUtils.deleteContactViaContactId(-1);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid contact ID');
        });

        it('should return an error response if contact does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 }); // no existing contact
            const result = await contactUtils.deleteContactViaContactId(1);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('Contact not found');
        });

        it('should delete the contact and return a success response', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1, rows: [{}] }) // contact exists
                .mockResolvedValueOnce({ rowCount: 1, rows: [{}] }) // reverse contact exists
                .mockResolvedValueOnce({ rowCount: 1 }); // update reverse contact

            const result = await contactUtils.deleteContactViaContactId(1);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeNull();
        });
    });
});