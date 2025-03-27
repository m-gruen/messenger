import express from 'express';
import { DbSession } from '../db';
import { StatusCodes } from 'http-status-codes';
import argon2 from '@node-rs/argon2';
import { User } from '../models/user';

const passwordOptions = {
    memoryCost: 2 ** 16,
    timeCost: 4,
    outputLen: 32,
    parallelism: 2,
    algorithm: argon2.Algorithm.Argon2id,
};

async function hashPassword(password: string): Promise<string> {
    try {
        return await argon2.hash(password, passwordOptions);
    } catch (error) {
        throw new Error(`error hashing password: ${error}`);
    }
}

async function verifyPassword(hashed: string, password: string): Promise<boolean> {
    try {
        return await argon2.verify(hashed, password, passwordOptions);
    } catch (error) {
        throw new Error(`error verifying password: ${error}`);
    }
}

export const userRouter = express.Router();

userRouter.post('/', async (req, res) => {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || username.length < 3 || username.length > 20) {
        res.status(StatusCodes.BAD_REQUEST).send({ error: 'username must be valid string between 3 and 20 characters' });
        return;
    }
    if (!password || typeof password !== 'string') {
        res.status(StatusCodes.BAD_REQUEST).send({ error: 'password must be valid string' });
        return;
    }
    if (!(/^[a-zA-Z0-9_]+$/.test(username))) {
        res.status(StatusCodes.BAD_REQUEST).send({ error: 'username can only contain letters, numbers, and underscores' });
        return;
    }

    const dbSession = await DbSession.create(false);

    try {
        const result = await dbSession.query(
            'INSERT INTO "user" (username, password_hash) VALUES ($1, $2) RETURNING uid, username, created_at',
            [username, await hashPassword(password)]
        );

        if (result.rowCount === 0) {
            await dbSession.complete(false);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: 'failed to create user' });
            return;
        }

        const user: User = result.rows[0];
        await dbSession.complete(true);
        res.status(StatusCodes.CREATED).send(user);
    } catch (error) {
        await dbSession.complete(false);
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: 'internal server error' });
    }
});

userRouter.get('/:uid', async (req, res) => {
    const uid: number = parseInt(req.params.uid);

    if (isNaN(uid) || uid < 0 || !Number.isInteger(uid)) {
        res.status(StatusCodes.BAD_REQUEST).send({ error: 'invalid user id' });
        return;
    }

    const dbSession = await DbSession.create(true);

    try {
        const result = await dbSession.query(
            'SELECT "uid", "username", "created_at" FROM "user" WHERE uid = $1',
            [uid]
        );

        if (result.rowCount === 0) {
            res.status(StatusCodes.NOT_FOUND).send({ error: 'user not found' });
            return;
        }

        const user: User = result.rows[0];
        res.send(user);
    } catch (error) {
        console.error(error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send({ error: 'internal server error' });
    } finally {
        await dbSession.complete();
    }
});
