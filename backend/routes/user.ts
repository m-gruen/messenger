import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { createUser, getUserById, UserResponse } from '../utilities/user-utils';

export const userRouter = express.Router();

userRouter.post('/', async (req, res) => {
    const { username, password } = req.body;

    try {
        const response: UserResponse = await createUser(username, password);
        res.status(response.statusCode).json(
            response.data !== null ? response.data : { error: response.error }
        );
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "An unexpected error occurred while processing your request"
        });
    }
});

userRouter.get('/:uid', async (req, res) => {
    const uid: number = parseInt(req.params.uid);

    try {
        const response: UserResponse = await getUserById(uid);
        res.status(response.statusCode).json(
            response.data !== null ? response.data : { error: response.error }
        );
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "An unexpected error occurred while processing your request"
        });
    }
});
