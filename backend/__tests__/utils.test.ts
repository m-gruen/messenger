import { Utils } from '../utilities/utils';
import { DbSession } from '../db';
import { ContactStatus } from '../models/contact-model';

describe('Utils', () => {
    let dbSessionMock: DbSession;
    let utils: Utils;

    beforeEach(() => {
        dbSessionMock = {
            query: jest.fn()
        } as unknown as DbSession;

        class ConcreteUtils extends Utils { }
        utils = new ConcreteUtils(dbSessionMock);
    });

    describe('isValidUserId', () => {
        it('should return true for valid user IDs', () => {
            expect(utils.isValidUserId(1)).toBe(true);
            expect(utils.isValidUserId(100)).toBe(true);
        });

        it('should return false for invalid user IDs', () => {
            expect(utils.isValidUserId(-1)).toBe(false);
            expect(utils.isValidUserId(0)).toBe(false);
            expect(utils.isValidUserId(NaN)).toBe(false);
            expect(utils.isValidUserId(1.5)).toBe(false);
        });
    });

    describe('userExists', () => {
        it('should return true if user exists in the database', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
            const result = await utils.userExists(1);
            expect(result).toBe(true);
        });

        it('should return false if user does not exist in the database', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await utils.userExists(1);
            expect(result).toBe(false);
        });

        it('should return false for invalid user IDs', async () => {
            const result = await utils.userExists(-1);
            expect(result).toBe(false);
        });
    });

    describe('hasContactWith', () => {
        it('should return true if a contact relationship exists', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 1 });
            const result = await utils.hasContactWith(1, 2);
            expect(result).toBe(true);
        });

        it('should return false if no contact relationship exists', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await utils.hasContactWith(1, 2);
            expect(result).toBe(false);
        });

        it('should return false for invalid sender ID', async () => {
            const result = await utils.hasContactWith(-1, 2);
            expect(result).toBe(false);
        });

        it('should return false for invalid receiver ID', async () => {
            const result = await utils.hasContactWith(1, -2);
            expect(result).toBe(false);
        });
    });

    describe('canSendMessage', () => {
        it('should return false if no contact relationship exists', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({ rowCount: 0 });
            const result = await utils.canSendMessage(1, 2);
            expect(result).toBe(false);
        });

        it('should return true if the user can send messages', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({
                rowCount: 1,
                rows: [{ status: ContactStatus.ACCEPTED }]
            });
            const result = await utils.canSendMessage(1, 2);
            expect(result).toBe(true);
        });

        it('should return false if the user is blocked', async () => {
            (dbSessionMock.query as jest.Mock).mockResolvedValue({
                rowCount: 1,
                rows: [{ status: ContactStatus.BLOCKED }]
            });
            const result = await utils.canSendMessage(1, 2);
            expect(result).toBe(false);
        });

        it('should return false for invalid sender ID', async () => {
            const result = await utils.canSendMessage(-1, 2);
            expect(result).toBe(false);
        });

        it('should return false for invalid receiver ID', async () => {
            const result = await utils.canSendMessage(1, -2);
            expect(result).toBe(false);
        });
    });

    describe('isUserBlocked', () => {
        it('should return true if the user is blocked', async () => {
            jest.spyOn(utils, 'canSendMessage').mockResolvedValue(false);
            const result = await utils.isUserBlocked(1, 2);
            expect(result).toBe(true);
        });

        it('should return false if the user is not blocked', async () => {
            jest.spyOn(utils, 'canSendMessage').mockResolvedValue(true);
            const result = await utils.isUserBlocked(1, 2);
            expect(result).toBe(false);
        });
    });

    describe('createErrorResponse', () => {
        it('should create an error response', () => {
            const response = utils['createErrorResponse'](400, 'Bad Request');
            expect(response).toEqual({
                statusCode: 400,
                data: null,
                error: 'Bad Request'
            });
        });
    });

    describe('createSuccessResponse', () => {
        it('should create a success response', () => {
            const response = utils['createSuccessResponse']({ id: 1 });
            expect(response).toEqual({
                statusCode: 200,
                data: { id: 1 }
            });
        });
    });

    describe('isValidString', () => {
        it('should return true for valid strings', () => {
            expect(utils['isValidString']('hello', 3, 10)).toBe(true);
            expect(utils['isValidString']('test', undefined, 10)).toBe(true);
            expect(utils['isValidString']('valid', undefined, undefined, /^[a-z]+$/)).toBe(true);
            expect(utils['isValidString']('12345', undefined, undefined, /^[0-9]+$/)).toBe(true);
            expect(utils['isValidString']('valid', 3)).toBe(true);
            expect(utils['isValidString']('valid', undefined, 10)).toBe(true);
            expect(utils['isValidString']('valid', 3, 6, /^[a-z]+$/)).toBe(true);
        });

        it('should return false for invalid strings', () => {
            expect(utils['isValidString']('', 1)).toBe(false);
            expect(utils['isValidString']('short', 10)).toBe(false);
            expect(utils['isValidString']('toolongstring', undefined, 5)).toBe(false);
            expect(utils['isValidString']('invalid', undefined, undefined, /^[0-9]+$/)).toBe(false);
            expect(utils['isValidString']('invalid', 3, 6, /^[a-z]+$/)).toBe(false);
        });
    });
});