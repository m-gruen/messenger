import express, { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserUtils, UserResponse } from '../utilities/user-utils';
import { DbSession } from '../db';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth-middleware';

export const userRouter = express.Router();

userRouter.post('/', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    let dbSession = await DbSession.create(false);
    try {
        const userUtils = new UserUtils(dbSession);

        const response: UserResponse = await userUtils.createUser(username, password);

        res.status(response.statusCode).json(
            response.data !== null ? response.data : { error: response.error }
        );
        await dbSession.complete(true);
    } catch (error) {
        console.error(error);

        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "An unexpected error occurred while processing your request"
        });
        await dbSession.complete(false);
    }
});

userRouter.get('/:uid', authenticateToken, async (req: Request, res: Response) => {
    const uid: number = parseInt(req.params.uid);

    let dbSession = await DbSession.create(true);
    try {
        const userUtils = new UserUtils(dbSession);

        const response: UserResponse = await userUtils.getUserById(uid);

        res.status(response.statusCode).json(
            response.data !== null ? response.data : { error: response.error }
        );
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "An unexpected error occurred while processing your request"
        });
    } finally {
        await dbSession.complete();
    }
});

userRouter.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(StatusCodes.BAD_REQUEST).json({
            error: "username and password are required"
        });
        return;
    }

    let dbSession = await DbSession.create(true);
    try {
        const userUtils = new UserUtils(dbSession);

        const response: UserResponse = await userUtils.loginUser(username, password);

        res.status(response.statusCode).json(
            response.data !== null ? response.data : { error: response.error }
        );
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "an unexpected error occurred while processing your request"
        });
    } finally {
        await dbSession.complete();
    }
});
