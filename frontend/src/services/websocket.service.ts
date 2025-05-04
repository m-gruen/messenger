import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '../lib/config';
import type { IMessage } from '@/models/message-model';
import { storageService } from './storage.service';
import { DateFormatService } from './date-format.service';

export class WebSocketService {
    private socket: Socket | null = null;
    private messageHandlers: ((message: IMessage) => void)[] = [];

    /**
     * Initialize and connect to the WebSocket server
     * @param userId The current user's ID
     * @param token JWT authentication token
     */
    public connect(userId: number, token: string): void {
        if (this.socket) {
            this.disconnect();
        }

        const baseUrl = getBackendUrl();

        this.socket = io(baseUrl, {
            auth: { token },
            transports: ['websocket'],
            autoConnect: true
        });

        this.socket.on('connect', () => {
            console.log('WebSocket connected');

            // Join user's personal room
            if (this.socket) {
                this.socket.emit('join', userId);
            }
        });

        this.socket.on('new_message', (message: IMessage) => {
            // Skip processing messages that you sent yourself - they are already added by the sendMessage function
            const currentUser = storageService.getUser();
            if (currentUser?.uid === message.sender_uid) {
                return;
            }

            if (typeof message.timestamp === 'string') {
                message.timestamp = DateFormatService.createDateWithTimezone(message.timestamp);
            }

            // Notify all registered message handlers
            this.messageHandlers.forEach(handler => handler(message));
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
        });
    }

    /**
     * Disconnect from the WebSocket server
     */
    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Register a handler for new message events
     * @param handler Function to handle new messages
     */
    public onNewMessage(handler: (message: IMessage) => void): void {
        this.messageHandlers.push(handler);
    }

    /**
     * Remove a message handler
     * @param handler The handler to remove
     */
    public removeMessageHandler(handler: (message: IMessage) => void): void {
        this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    }

    /**
     * Check if the WebSocket is connected
     */
    public isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

// Export a singleton instance
export const websocketService = new WebSocketService();
