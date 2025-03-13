import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

app.get('/', (_, res) => {
    res.send('success');
});

app.listen(process.env.BACKEND_PORT, () => {
    console.log(`running on http://localhost:${process.env.BACKEND_PORT}`);
});
