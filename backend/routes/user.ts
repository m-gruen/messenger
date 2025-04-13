import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserUtils, UserResponse } from '../utilities/user-utils';
import { DbSession } from '../db';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth-middleware';

export const userRouter = Router();

userRouter.post('/', async (req: Request, res: Response) => {
    const { username, password, displayName } = req.body;

    let dbSession = await DbSession.create(false);
    try {
        const userUtils = new UserUtils(dbSession);

        const response: UserResponse = await userUtils.createUser(
            username, 
            password, 
            displayName
        );

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
            error: "An unexpected error occurred while processing your request"
        });
    } finally {
        await dbSession.complete();
    }
});

userRouter.delete('/:uid', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const uid = parseInt(req.params.uid);

    if (uid !== req.user?.uid) {
        res.status(StatusCodes.FORBIDDEN).json({
            error: 'You can only delete your own account'
        });
        return;
    }

    let dbSession = await DbSession.create(false);
    try {
        const userUtils = new UserUtils(dbSession);

        const result = await userUtils.deleteUser(uid);

        await dbSession.complete(result.statusCode === StatusCodes.OK);

        if (result.statusCode === StatusCodes.OK) {
            res.sendStatus(result.statusCode);
        } else {
            res.status(result.statusCode).json({ error: result.error });
        }
    } catch (error) {
        console.error(error);
        await dbSession.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "An unexpected error occurred while processing your request"
        });
    }
});

userRouter.put('/:uid', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const uid = parseInt(req.params.uid);
    const { username, password, displayName, shadowMode, fullNameSearch } = req.body;

    if (uid !== req.user?.uid) {
        res.status(StatusCodes.FORBIDDEN).json({
            error: 'You can only update your own account'
        });
        return;
    }

    if (username === undefined && 
        password === undefined && 
        displayName === undefined && 
        shadowMode === undefined && 
        fullNameSearch === undefined) {
        res.status(StatusCodes.BAD_REQUEST).json({
            error: 'Must provide at least one field to update'
        });
        return;
    }

    let dbSession = await DbSession.create(false);
    try {
        const userUtils = new UserUtils(dbSession);

        const result = await userUtils.updateUser(uid, {
            username,
            password,
            displayName,
            shadowMode,
            fullNameSearch
        });

        await dbSession.complete(result.statusCode === StatusCodes.OK);

        if (result.statusCode === StatusCodes.OK) {
            res.status(result.statusCode).json(result.data);
        } else {
            res.status(result.statusCode).json({ error: result.error });
        }
    } catch (error) {
        console.error(error);
        await dbSession.complete(false);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "An unexpected error occurred while processing your request"
        });
    }
});
