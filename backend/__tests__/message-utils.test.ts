import { MessageUtils } from "../utilities/message-utils";
import { DbSession } from "../db";
import { StatusCodes } from "http-status-codes";

describe('MessageUtils', () => {
    let dbSessionMock: DbSession;
    let messageUtils: MessageUtils;

    beforeEach(() => {
        dbSessionMock = {
            query: jest.fn()
        } as unknown as DbSession;

        messageUtils = new MessageUtils(dbSessionMock);
    });

    describe('sendMessage', () => {
        it('should return an error response for invalid sender UID', async () => {
            const result = await messageUtils.sendMessage(-1, 2, "Hello");
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid UID');
        });

        it('should return an error response for invalid receiver UID', async () => {
            const result = await messageUtils.sendMessage(1, -2, "Hello");
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid UID');
        });

        it('should return an error response if sender does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
            const result = await messageUtils.sendMessage(1, 2, "Hello");
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an error response if receiver does not exist', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // Sender exists
                .mockResolvedValueOnce({ rowCount: 0 }); // Receiver does not exist
            const result = await messageUtils.sendMessage(1, 2, "Hello");
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an error response if sender and receiver are the same', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // Sender exists
                .mockResolvedValueOnce({ rowCount: 1 }); // Receiver exists
            const result = await messageUtils.sendMessage(1, 1, "Hello");
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Cannot send message to self');
        });

        it('should return an error response if users are not contacts', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // Sender exists
                .mockResolvedValueOnce({ rowCount: 1 }) // Receiver exists
                .mockResolvedValueOnce({ rowCount: 0 }); // No contact relationship
            const result = await messageUtils.sendMessage(1, 2, "Hello");
            expect(result.statusCode).toBe(StatusCodes.FORBIDDEN);
            expect(result.error).toBe('Users are not contacts');
        });

        it('should return an error response if sender cannot send message to receiver', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // Sender exists
                .mockResolvedValueOnce({ rowCount: 1 }) // Receiver exists
                .mockResolvedValueOnce({ rowCount: 1 }) // Contact relationship exists
                .mockResolvedValueOnce({ rowCount: 0 }); // Cannot send message
            const result = await messageUtils.sendMessage(1, 2, "Hello");
            expect(result.statusCode).toBe(StatusCodes.FORBIDDEN);
            expect(result.error).toBe('Cannot send message to this user');
        });

        it('should return a success response when message is sent', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1,  }) // Sender exists
                .mockResolvedValueOnce({ rowCount: 1,  }) // Receiver exists
                .mockResolvedValueOnce({ rowCount: 1, }) // Contact relationship exists
                .mockResolvedValueOnce({ rowCount: 1, rows: [{}]}) // Can send message
                .mockResolvedValueOnce({
                    rowCount: 1,
                    rows: [{
                        mid: 1,
                        sender_uid: 1,
                        receiver_uid: 2,
                        content: "Hello",
                        timestamp: new Date()
                    }]
                }); // Message inserted
            const result = await messageUtils.sendMessage(1, 2, "Hello");
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toHaveLength(1);
            expect(result.data![0].content).toBe("Hello");
        });

        it('should return an error response if message insertion fails', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // Sender exists
                .mockResolvedValueOnce({ rowCount: 1 }) // Receiver exists
                .mockResolvedValueOnce({ rowCount: 1 }) // Contact relationship exists
                .mockResolvedValueOnce({ rowCount: 1, rows: [{}] }) // Can send message
                .mockResolvedValueOnce({ rowCount: 0 }); // Message insertion failed
            const result = await messageUtils.sendMessage(1, 2, "Hello");
            expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
            expect(result.error).toBe('Failed to send message');
        });
    });

    describe('fetchMessage', () => {
        it('should return an error response for invalid sender UID', async () => {
            const result = await messageUtils.fetchMessage(-1, 2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid UID');
        });

        it('should return an error response for invalid receiver UID', async () => {
            const result = await messageUtils.fetchMessage(1, -2);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Invalid UID');
        });

        it('should return an error response if sender does not exist', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
            const result = await messageUtils.fetchMessage(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an error response if receiver does not exist', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // Sender exists
                .mockResolvedValueOnce({ rowCount: 0 }); // Receiver does not exist
            const result = await messageUtils.fetchMessage(1, 2);
            expect(result.statusCode).toBe(StatusCodes.NOT_FOUND);
            expect(result.error).toBe('User not found');
        });

        it('should return an error response if sender and receiver are the same', async () => {
            (dbSessionMock.query as jest.Mock)
                .mockResolvedValueOnce({ rowCount: 1 }) // Sender exists
                .mockResolvedValueOnce({ rowCount: 1 }); // Receiver exists
            const result = await messageUtils.fetchMessage(1, 1);
            expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(result.error).toBe('Cannot fetch messages with self');
        });

        it('should return a success response with messages', async () => {
            (dbSessionMock.query as jest.Mock)
            .mockResolvedValueOnce({ rowCount: 1 }) // Sender exists
            .mockResolvedValueOnce({ rowCount: 1 }) // Receiver exists
            .mockResolvedValueOnce({
                rowCount: 2,
                rows: [
                    {
                        mid: 1,
                        sender_uid: 1,
                        receiver_uid: 2,
                        content: "Hello",
                        timestamp: new Date()
                    },
                    {
                        mid: 2,
                        sender_uid: 2,
                        receiver_uid: 1,
                        content: "Hi",
                        timestamp: new Date()
                    }
                ]
            });
            const result = await messageUtils.fetchMessage(1, 2);
            expect(result.statusCode).toBe(StatusCodes.OK);
            expect(result.data).toHaveLength(2);
            expect(result.data![0].content).toBe("Hello");
            expect(result.data![1].content).toBe("Hi");
        });
    });
});
