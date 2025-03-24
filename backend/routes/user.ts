import express from 'express';
import { DbSession } from '../db';
import { StatusCodes } from 'http-status-codes';

export const userRouter = express.Router();

userRouter.get('/:uid', async (req, res) => {
    const uid: number = parseInt(req.params.uid);

    if (isNaN(uid) || uid < 0 || !Number.isInteger(uid)) {
        res.status(StatusCodes.BAD_REQUEST).send({ error: 'invalid user id' });
        return;
    }

    const dbSession = await DbSession.create(true);

    try {
        const result = await dbSession.query(
            'SELECT "username", "created_at" FROM "user" WHERE uid = $1',
            [uid]
        );

        if (result.rowCount === 0) {
            res.status(StatusCodes.NOT_FOUND).send({ error: 'user not found' });
            return;
        }

        res.send(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: 'internal server error' });
    } finally {
        await dbSession.complete();
    }
});
