import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { UserUtils, UserResponse } from '../utilities/user-utils';
import { DbSession } from '../db';

export const userRouter = express.Router();

userRouter.post('/', async (req, res) => {
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

userRouter.get('/:uid', async (req, res) => {
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
