import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.get('/', (_, res) => {
    res.send('success');
});

app.listen(process.env.PORT, () => {
    console.log(`running on http://localhost:${process.env.PORT}`);
});
