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

    describe('Database error handling', () => {
        it('should handle database query errors when fetching contacts', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // User exists
                .mockRejectedValueOnce(new Error('Database connection error'));

            const result = await contactUtils.getContacts(1);
            expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(result.error).toBe('Failed to fetch contacts.');
        });

        it('should handle database query errors when adding a contact', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 0 }) // No existing contact
                .mockRejectedValueOnce(new Error('Database transaction failed'));

            const result = await contactUtils.addContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(result.error).toBe('Failed to add contact.');
        });

        it('should handle database query errors when updating block status', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockRejectedValueOnce(new Error('Database timeout'));

            const result = await contactUtils.updateContactBlockStatus(1, 2, true);
            expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(result.error).toBe('Failed to update contact.');
        });
    });

    describe('Data mapping validation', () => {
        it('should correctly map DB response with null values to Contact objects', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // User exists
                .mockResolvedValueOnce({
                    rows: [
                        {
                            contact_id: 1,
                            uid: 2,
                            username: 'John',
                            created_at: null,  // null date
                            status: ContactStatus.ACCEPTED
                        }
                    ]
                });

            const result = await contactUtils.getContacts(1);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeDefined();
            // Use non-null assertion operator since we've verified data exists
            expect(result.data![0].createdAt).toBeNull();
        });

        it('should handle incomplete DB response row data', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // User exists
                .mockResolvedValueOnce({
                    rows: [
                        {
                            contact_id: 1,
                            userId: 2,
                            // contactUser is missing
                            created_at: '2023-01-01',
                            status: ContactStatus.ACCEPTED
                        }
                    ]
                });

            const result = await contactUtils.getContacts(1);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeDefined();
            expect(result.data![0].contactUserId).toBeUndefined();
        });
    });

    describe('Invalid status transitions', () => {
        it('should return an error when trying to block a contact with OUTGOING_REQUEST status', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.OUTGOING_REQUEST }] }); // outgoing request

            const result = await contactUtils.updateContactBlockStatus(1, 2, true);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Only accepted contacts can be blocked');
        });

        it('should return an error when trying to accept a contact that is not in INCOMING_REQUEST status', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.OUTGOING_REQUEST }] }); // wrong status

            const result = await contactUtils.acceptContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Only incoming contact requests can be accepted');
        });

        it('should return an error when trying to reject a contact that is not in INCOMING_REQUEST status', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.BLOCKED }] }); // wrong status

            const result = await contactUtils.rejectContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Only incoming contact requests can be rejected');
        });
    });

    describe('Authorization edge cases', () => {
        it('should not find contact when querying with incorrect user ID combination', async () => {
            // Setup: contact exists between users 1 and 2, but we're trying to access with user 3
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId 3
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId 2
                .mockResolvedValueOnce({ rowCount: 0 }); // No contact record for user 3 and 2

            const result = await contactUtils.deleteContact(3, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('Contact not found');
        });

        it('should not find the contact when accessing a contact ID that belongs to another user', async () => {
            // Setup: contact_id 1 exists but doesn't belong to requesting user
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 0 }); // No contact found with that ID for this user

            const result = await contactUtils.deleteContactViaContactId(1);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('Contact not found');
        });
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

    describe('getIncomingRequests', () => {
        it('should return an error response for invalid user ID', async () => {
            const result = await contactUtils.getIncomingRequests(-1);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid user ID');
        });

        it('should return an error response if user does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await contactUtils.getIncomingRequests(1);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an empty list if the user has no incoming requests', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({ rows: [] }); // No incoming requests

            const result = await contactUtils.getIncomingRequests(1);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toEqual([]);
        });

        it('should return a success response with incoming requests', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({
                    rows: [
                        { contact_id: 1, uid: 2, username: 'John', created_at: '2023-01-01', status: ContactStatus.INCOMING_REQUEST }
                    ]
                });

            const result = await contactUtils.getIncomingRequests(1);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toEqual([
                { contactId: 1, userId: 1, contactUserId: 2, username: 'John', createdAt: '2023-01-01', status: ContactStatus.INCOMING_REQUEST }
            ]);
        });
    });

    describe('getOutgoingRequests', () => {
        it('should return an error response for invalid user ID', async () => {
            const result = await contactUtils.getOutgoingRequests(-1);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid user ID');
        });

        it('should return an error response if user does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await contactUtils.getOutgoingRequests(1);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an empty list if the user has no outgoing requests', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({ rows: [] }); // No outgoing requests

            const result = await contactUtils.getOutgoingRequests(1);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toEqual([]);
        });

        it('should return a success response with outgoing requests', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 })
                .mockResolvedValueOnce({
                    rows: [
                        { contact_id: 1, uid: 2, username: 'John', created_at: '2023-01-01', status: ContactStatus.OUTGOING_REQUEST }
                    ]
                });

            const result = await contactUtils.getOutgoingRequests(1);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toEqual([
                { contactId: 1, userId: 1, contactUserId: 2, username: 'John', createdAt: '2023-01-01', status: ContactStatus.OUTGOING_REQUEST }
            ]);
        });
    });

    describe('acceptContact', () => {
        it('should return an error response for invalid user IDs', async () => {
            const result = await contactUtils.acceptContact(-1, 2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid user ID');
        });

        it('should return an error response if user tries to accept their own request', async () => {
            const result = await contactUtils.acceptContact(1, 1);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Cannot accept your own contact request');
        });

        it('should return an error response if user does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await contactUtils.acceptContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an error response if contact does not exist', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 0 }); // no existing contact

            const result = await contactUtils.acceptContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('Contact not found');
        });

        it('should return an error response if contact is not in incoming request status', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.ACCEPTED }] }); // contact already accepted

            const result = await contactUtils.acceptContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Only incoming contact requests can be accepted');
        });

        it('should return an error response if no pending contact request is found', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.INCOMING_REQUEST }] }) // contact exists
                .mockResolvedValueOnce({ rowCount: 0 }); // no pending contact request

            const result = await contactUtils.acceptContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('No pending contact request found');
        });

        it('should accept the contact request and return a success response', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.INCOMING_REQUEST }] }) // contact exists
                .mockResolvedValueOnce({ rowCount: 1 }); // update query

            const result = await contactUtils.acceptContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeNull();
        });
    });

    describe('rejectContact', () => {
        it('should return an error response for invalid user IDs', async () => {
            const result = await contactUtils.rejectContact(-1, 2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid user ID');
        });

        it('should return an error response if user tries to reject their own request', async () => {
            const result = await contactUtils.rejectContact(1, 1);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Cannot reject your own contact request');
        });

        it('should return an error response if user does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await contactUtils.rejectContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an error response if contact does not exist', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 0 }); // no existing contact

            const result = await contactUtils.rejectContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('Contact not found');
        });

        it('should return an error response if contact is not in incoming request status', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.ACCEPTED }] }); // contact already accepted

            const result = await contactUtils.rejectContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Only incoming contact requests can be rejected');
        });

        it('should return an error response if no pending contact request is found', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.INCOMING_REQUEST }] }) // contact exists
                .mockResolvedValueOnce({ rowCount: 0 }); // no pending contact request

            const result = await contactUtils.rejectContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('No pending contact request found');
        });

        it('should reject the contact request and return a success response', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for userId
                .mockResolvedValueOnce({ rowCount: 1 }) // userExists for contactUserId
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ status: ContactStatus.INCOMING_REQUEST }] }) // contact exists
                .mockResolvedValueOnce({ rowCount: 1 }); // update query

            const result = await contactUtils.rejectContact(1, 2);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toBeNull();
        });
    });
});
