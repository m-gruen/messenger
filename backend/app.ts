import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path, { dirname, join } from 'path';
import { userRouter } from './routes/user';
import { DbSession } from './db';
import { fileURLToPath } from 'url';
import { contactRouter } from './routes/contact';
import { msgRouter } from './routes/message';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config({
    path: path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../.env'
    ),
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to a personal room based on their user ID
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their room`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Export io so it can be used in other files
export { io };

// Increase JSON payload size limit to handle image data (10MB)
app.use(express.json({ limit: '10mb' }));
// Configure CORS with explicit origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
// Increase URL-encoded payload size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/user', userRouter);
app.use('/contact', contactRouter);
app.use('/message', msgRouter);

if (!process.env.BACKEND_PORT) {
    throw new Error('BACKEND_PORT is not set');
}

server.listen(process.env.BACKEND_PORT, async () => {
    await DbSession.ensureTablesCreated();
    console.log(`running on http://localhost:${process.env.BACKEND_PORT}`);
});
