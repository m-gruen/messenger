import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({
    path: path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../.env'
    ),
});

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface TokenPayload {
    uid: number;
    username: string;
}

export class JwtUtils {
    static generateToken(payload: TokenPayload): string {
        return jwt.sign(payload, JWT_SECRET);
    }

    static verifyToken(token: string): TokenPayload | null {
        try {
            return jwt.verify(token, JWT_SECRET) as TokenPayload;
        } catch (error) {
            return null;
        }
    }
}
