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
});