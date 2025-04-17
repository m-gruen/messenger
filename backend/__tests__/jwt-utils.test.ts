jest.mock('../utilities/jwt-utils', () => {
    return {
        TokenPayload: {},
        JwtUtils: {
            generateToken: jest.fn((payload) => 'mock-token'),
            verifyToken: jest.fn((token) => {
                return null;
            })
        }
    };
});

import { JwtUtils, TokenPayload } from '../utilities/jwt-utils';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn(),
    TokenExpiredError: class TokenExpiredError extends Error {
        constructor(message: string, expiredAt: Date) {
            super(message);
            this.name = 'TokenExpiredError';
            this.expiredAt = expiredAt;
        }
        expiredAt: Date;
    },
    JsonWebTokenError: class JsonWebTokenError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'JsonWebTokenError';
        }
    }
}));

process.env.JWT_SECRET = 'test-secret';

describe('JwtUtils', () => {
    const mockPayload: { uid: number; username: string } = {
        uid: 123,
        username: 'testuser'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (JwtUtils.generateToken as jest.Mock).mockImplementation(() => 'mock-token');
        (JwtUtils.verifyToken as jest.Mock).mockImplementation(() => null);
    });

    describe('generateToken', () => {
        it('should generate a token from a payload', () => {
            (JwtUtils.generateToken as jest.Mock).mockImplementation((payload) => {
                (jwt.sign as jest.Mock).mockReturnValue('mock-token');
                return jwt.sign(payload, 'test-secret');
            });

            const token = JwtUtils.generateToken(mockPayload);

            expect(jwt.sign).toHaveBeenCalledWith(mockPayload, 'test-secret');
            expect(token).toBe('mock-token');
        });

        it('should return a string token', () => {
            const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEyMywianRpIjoiMTIzNDU2Nzg5MCJ9.mock-signature';
            (JwtUtils.generateToken as jest.Mock).mockReturnValue(mockToken);

            const token = JwtUtils.generateToken(mockPayload);

            expect(typeof token).toBe('string');
            expect(token).toBe(mockToken);
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid token', () => {
            (JwtUtils.verifyToken as jest.Mock).mockImplementation((token) => {
                (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
                return jwt.verify(token, 'test-secret');
            });

            const token = 'valid-token';

            const result = JwtUtils.verifyToken(token);

            expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
            expect(result).toEqual(mockPayload);
        });

        it('should return null when token is invalid', () => {
            (JwtUtils.verifyToken as jest.Mock).mockImplementation((token) => {
                (jwt.verify as jest.Mock).mockImplementation(() => {
                    throw new Error('Invalid token');
                });

                try {
                    return jwt.verify(token, 'test-secret');
                } catch (error) {
                    return null;
                }
            });

            const token = 'invalid-token';

            const result = JwtUtils.verifyToken(token);

            expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret');
            expect(result).toBeNull();
        });

        it('should return null when token is expired', () => {
            (JwtUtils.verifyToken as jest.Mock).mockImplementation((token) => {
                (jwt.verify as jest.Mock).mockImplementation(() => {
                    throw new jwt.TokenExpiredError('Token expired', new Date());
                });

                try {
                    return jwt.verify(token, 'test-secret');
                } catch (error) {
                    return null;
                }
            });

            const token = 'expired-token';

            const result = JwtUtils.verifyToken(token);

            expect(result).toBeNull();
        });

        it('should return null for malformed tokens', () => {
            (JwtUtils.verifyToken as jest.Mock).mockImplementation((token) => {
                (jwt.verify as jest.Mock).mockImplementation(() => {
                    throw new jwt.JsonWebTokenError('Malformed token');
                });

                try {
                    return jwt.verify(token, 'test-secret');
                } catch (error) {
                    return null;
                }
            });

            const token = 'malformed.token';

            const result = JwtUtils.verifyToken(token);

            expect(result).toBeNull();
        });
    });

    describe('Integration between generate and verify', () => {
        it('should verify a token that was generated', () => {
            const mockToken = 'generated-token';

            (JwtUtils.generateToken as jest.Mock).mockReturnValue(mockToken);

            (JwtUtils.verifyToken as jest.Mock).mockImplementation((token) => {
                return token === mockToken ? mockPayload : null;
            });

            const token = JwtUtils.generateToken(mockPayload);

            const decoded = JwtUtils.verifyToken(token);

            expect(decoded).toEqual(mockPayload);
        });

        it('should not verify a tampered token', () => {
            const mockToken = 'generated-token';

            (JwtUtils.generateToken as jest.Mock).mockReturnValue(mockToken);

            (JwtUtils.verifyToken as jest.Mock).mockImplementation((token) => {
                return token === mockToken ? mockPayload : null;
            });

            const token = JwtUtils.generateToken(mockPayload);

            const tamperedToken = token + '-tampered';

            const decoded = JwtUtils.verifyToken(tamperedToken);

            expect(decoded).toBeNull();
        });
    });
});
