import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { JwtUtils } from '../utilities/jwt-utils';

export interface AuthenticatedRequest extends Request {
    user?: {
        uid: number;
        username: string;
    };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Authentication token is required' });
        return;
    }

    const payload = JwtUtils.verifyToken(token);
    if (!payload) {
        res.status(StatusCodes.FORBIDDEN).json({ error: 'Invalid or expired token' });
        return;
    }

    req.user = {
        uid: payload.uid,
        username: payload.username
    };

    next();
}
