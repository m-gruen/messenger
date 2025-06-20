import { defineStore } from 'pinia'
import { ref, computed, onUnmounted, watchEffect } from 'vue'
import type { IMessage } from '@/models/message-model'
import { apiService } from '@/services/api.service'
import { storageService } from '@/services/storage.service'
import { websocketService } from '@/services/websocket.service'
import { encryptionService } from '@/services/encryption.service'
import { messageContentService } from '@/services/message-content.service'

export const useMessageStore = defineStore('messages', () => {
    // State
    const messages = ref<IMessage[]>([])
    const isLoading = ref(false)
    const error = ref<string | undefined>(undefined)
    const sendError = ref<string | undefined>(undefined)
    const activeContactId = ref<number | null>(null)

    // Pagination state
    const totalMessagePages = ref(0);
    const currentMessagePage = ref(0);

    // Get user ID and token from storage service
    const user = storageService.getUser()
    const currentUserId = computed(() => user?.uid || 0)
    const token = computed(() => storageService.getToken() || '')

    // Function to delete a message locally (for current user only)
    const deleteLocalMessage = async (messageId: number) => {
        try {
            if (activeContactId.value) {
                const success = await storageService.deleteMessage(
                    currentUserId.value,
                    activeContactId.value,
                    messageId
                );
                
                if (!success) {
                    console.error('Failed to delete message:', messageId);
                    return false;
                }
            }
            
            messages.value = messages.value.filter(msg => msg.mid !== messageId);
            
            return true;
        } catch (error) {
            console.error('Error deleting local message:', error);
            return false;
        }
    }

    // Connect to WebSocket when store is created
    if (currentUserId.value && token.value) {
        websocketService.connect(currentUserId.value, token.value)
    }

    // Message handler for real-time updates
    const handleNewMessage = async (message: IMessage) => {
        try {
            // Process the message to ensure valid date
            const processedMessage = ensureValidDate(message);

            // Check if we're the receiver of this message
            const isReceiver = message.receiver_uid === currentUserId.value;

            // If I am the receiver, I need to:
            // 1. Decrypt and store the message locally
            // 2. Delete it from the server
            if (isReceiver) {
                // Prevent duplicates
                const messageExists = messages.value.some(m => m.mid === message.mid);
                if (messageExists) {
                    return;
                }

                // Check if we have content and nonce (required for encrypted messages)
                if (message.content && message.nonce) {
                    const senderUser = await apiService.getUserById(message.sender_uid, token.value);
                    const currentUser = storageService.getUser();

                    if (senderUser && currentUser) {
                        try {
                            // Decrypt the message
                            const decryptedContent = await encryptionService.decryptMessage(
                                senderUser,
                                currentUser,
                                {
                                    encryptedContentBase64: processedMessage.content,
                                    nonceBase64: processedMessage.nonce
                                },
                                false // Current user is the receiver
                            );

                            // Create the message with decrypted content
                            // The decryptedContent is the JSON string of our structured message
                            const decryptedMessage = {
                                ...processedMessage,
                                content: decryptedContent // This should already be a JSON string
                            };

                            // Store locally for future access
                            await storageService.addMessageToContact(
                                currentUserId.value,
                                message.sender_uid,
                                decryptedMessage
                            );

                            // Delete from server now that it's stored locally
                            try {
                                await apiService.markMessagesAsReceived(
                                    currentUserId.value,
                                    [message.mid],
                                    token.value
                                );
                                console.log(`Message ${message.mid} deleted from server after WebSocket receipt`);
                            } catch (deleteError) {
                                console.error('Error deleting message from server:', deleteError);
                            }

                            // Only update UI if this message belongs to the current conversation
                            if (activeContactId.value === message.sender_uid) {
                                // Update the conversation view
                                messages.value = [...messages.value, decryptedMessage].sort((a, b) => {
                                    const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                                    const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                                    return timeB - timeA;
                                });

                                // Scroll to show the new message
                                smoothScrollToRecentMessages();
                            }
                        } catch (decryptError) {
                            console.error('Failed to decrypt WebSocket message:', decryptError);

                            // Store the message with an error indicator to prevent it from getting lost
                            const errorMessage = {
                                ...processedMessage,
                                content: JSON.stringify({
                                    type: 'text',
                                    content: "⚠️ This message could not be decrypted. It may be an image or contain special content."
                                }),
                                decryptionFailed: true
                            };

                            // Store the message anyway so it doesn't get lost
                            await storageService.addMessageToContact(
                                currentUserId.value,
                                message.sender_uid,
                                errorMessage
                            );

                            // Only update UI if this message belongs to the current conversation
                            if (activeContactId.value === message.sender_uid) {
                                // Add error message to conversation view
                                messages.value = [...messages.value, errorMessage].sort((a, b) => {
                                    const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                                    const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                                    return timeB - timeA;
                                });
                            }

                            // Try to delete the message from the server anyway
                            try {
                                await apiService.markMessagesAsReceived(
                                    currentUserId.value,
                                    [message.mid],
                                    token.value
                                );
                            } catch (deleteError) {
                                console.error('Error deleting unreadable message from server:', deleteError);
                            }
                        }
                    }
                }
            }
            // If I'm the sender, I already have the message locally - no need to do anything
            // The receiver will handle deletion from server
        } catch (err) {
            console.error('Error processing WebSocket message:', err);
        }
    }

    // Register message handler
    websocketService.onNewMessage(handleNewMessage)

    // Ensure websocket is connected when user and token change
    watchEffect(() => {
        if (currentUserId.value && token.value) {
            if (!websocketService.isConnected()) {
                websocketService.connect(currentUserId.value, token.value)
            }
        } else {
            websocketService.disconnect()
        }
    })

    // Clean up on component unmount
    onUnmounted(() => {
        websocketService.removeMessageHandler(handleNewMessage)
    })

    /**
     * Ensure message timestamp is a valid Date object
     */
    function ensureValidDate(message: IMessage): IMessage {
        try {
            // Make a copy of the message to avoid mutation issues
            const processedMessage = { ...message }

            if (processedMessage.timestamp) {
                if (!(processedMessage.timestamp instanceof Date)) {
                    processedMessage.timestamp = new Date(processedMessage.timestamp)
                }

                // Verify it's a valid date
                if (isNaN(processedMessage.timestamp.getTime())) {
                    console.warn('Invalid timestamp detected, using current time', message)
                    processedMessage.timestamp = new Date()
                }
            } else {
                // If no timestamp provided, use current time
                processedMessage.timestamp = new Date()
            }

            return processedMessage
        } catch (err) {
            console.error('Error processing message timestamp:', err)
            return {
                ...message,
                timestamp: new Date()
            }
        }
    }

    /**
     * Position to the most recent messages immediately (for initial load)
     */
    function positionToRecentMessages() {
        setTimeout(() => {
            const messageList = document.querySelector('.message-list-container')
            if (messageList) {
                // Instantly jump to the bottom without animation
                messageList.scrollTop = messageList.scrollHeight
            }
        }, 100)
    }

    /**
     * Smooth scroll to the most recent messages (for new sent messages)
     */
    function smoothScrollToRecentMessages() {
        setTimeout(() => {
            const messageList = document.querySelector('.message-list-container')
            if (messageList) {
                messageList.scrollTo({
                    top: messageList.scrollHeight,
                    behavior: 'smooth'
                })
            }
        }, 100)
    }

    // No longer needed - all messages are now stored locally

    /**
     * Fetch messages between current user and a contact
     */
    async function fetchMessages(contactUserId: number) {
        error.value = undefined
        isLoading.value = true
        messages.value = [] // Clear previous messages
        activeContactId.value = contactUserId // Set active contact

        try {
            // New approach: First check for any new messages on the server
            let newMessagesFound = false;
            let messagesToAcknowledge: number[] = [];

            if (token.value) {
                try {
                    // Fetch server messages
                    const serverMessages = await apiService.getMessages(
                        currentUserId.value,
                        contactUserId,
                        token.value
                    );

                    if (serverMessages.length > 0) {
                        newMessagesFound = true;

                        // Process all messages to ensure valid dates
                        const processedMessages = serverMessages.map(ensureValidDate);

                        // Store the message IDs we need to acknowledge
                        messagesToAcknowledge = processedMessages
                            .filter(msg => msg.receiver_uid === currentUserId.value)
                            .map(msg => msg.mid);

                        // Store fetched messages locally
                        await storageService.storeMessagesForContact(
                            currentUserId.value,
                            contactUserId,
                            processedMessages
                        );

                        console.log(`Stored ${processedMessages.length} new messages from server`);

                        // Delete the messages from server after storing locally
                        if (messagesToAcknowledge.length > 0) {
                            try {
                                const result = await apiService.markMessagesAsReceived(
                                    currentUserId.value,
                                    messagesToAcknowledge,
                                    token.value
                                );
                                console.log(`Deleted ${result.deleted} messages from server after local storage`);
                            } catch (deleteError) {
                                console.error('Error deleting messages from server:', deleteError);
                                // Continue anyway since we already have the messages locally
                            }
                        }
                    }
                } catch (serverError) {
                    console.warn('Failed to fetch messages from server:', serverError);
                    // Continue with local messages
                }
            }

            // Now load all messages from local storage (including any we just received)
            const localMessages = await storageService.getMessagesForContact(
                currentUserId.value,
                contactUserId
            );

            // Process all messages to ensure valid dates
            const processedLocalMessages = localMessages.map(ensureValidDate);

            // Sort messages (newest first for display)
            messages.value = processedLocalMessages.sort((a, b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });

            // Position to recent messages
            positionToRecentMessages();

            // Show a notification if we found new messages
            if (newMessagesFound) {
                console.log('New messages were found and added to local storage');
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load messages';
            console.error('Error fetching messages:', err);
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Send a new message to a contact
     */
    async function sendMessage(receiverId: number, content: any) {
        // Clear any previous send errors
        sendError.value = undefined;

        try {
            // Get the contact user data for encryption keys
            const contactUser = await apiService.getUserById(receiverId, token.value);
            const currentUser = storageService.getUser();

            if (!contactUser || !currentUser) {
                throw new Error('Could not get user information needed for encryption');
            }

            // Format content based on message type
            let messageContent: string;

            // Check if content is a structured object (from image upload)
            if (typeof content === 'object' && content !== null) {
                // It's either an image or other structured content
                messageContent = JSON.stringify(content);
            } else {
                // It's a plain text message
                messageContent = JSON.stringify({
                    type: 'text',
                    content: content
                });
            }

            // First prepare local representation with placeholders for ID and timestamp
            // that will be filled in after server response
            const tempMessage: IMessage = {
                mid: -1, // Temporary ID that will be replaced
                sender_uid: currentUserId.value,
                receiver_uid: receiverId,
                content: messageContent, // Store the structured content locally
                nonce: '', // Will be filled in after server response
                timestamp: new Date()
            };

            // Add the unencrypted message to the displayed messages immediately
            const processedTempMessage = ensureValidDate(tempMessage);

            // Add to the list and re-sort
            messages.value = [...messages.value, processedTempMessage].sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeB - timeA;
            });

            // Smoothly scroll to show the new message
            smoothScrollToRecentMessages();

            // Now send the encrypted message to the server
            const newMessage = await apiService.sendMessage(
                currentUserId.value,
                receiverId,
                messageContent, // Send the JSON stringified content
                token.value
            );

            // Process the message to ensure valid date
            const processedMessage = ensureValidDate({ ...newMessage });

            // Create the actual message to store locally
            const storedMessage = {
                ...processedMessage,
                content: messageContent // Store the decrypted content as JSON string
            };

            // Find and replace the temporary message
            const tempIndex = messages.value.findIndex(m =>
                m.mid === -1 &&
                m.sender_uid === processedMessage.sender_uid &&
                m.receiver_uid === processedMessage.receiver_uid
            );

            if (tempIndex !== -1) {
                // Replace the temp message with the real one
                messages.value.splice(tempIndex, 1, storedMessage);
            }

            // Store the message locally
            await storageService.addMessageToContact(
                currentUserId.value,
                receiverId,
                storedMessage
            );

            return newMessage;
        } catch (err) {
            console.error('Error sending message:', err);
            sendError.value = err instanceof Error ? err.message : 'Failed to send message';
            throw err;
        }
    }

    /**
     * Send a reply to a message
     * @param receiverId User ID of the message recipient
     * @param originalMessage The message being replied to
     * @param content Reply content (can be text or structured object for media)
     */
    async function replyToMessage(receiverId: number, originalMessage: IMessage, content: any) {
        // Clear any previous send errors
        sendError.value = undefined;

        try {
            // Get the contact user data for encryption keys
            const contactUser = await apiService.getUserById(receiverId, token.value);
            const currentUser = storageService.getUser();

            if (!contactUser || !currentUser) {
                throw new Error('Could not get user information needed for encryption');
            }

            // Format content based on message type
            let messageContent: string;

            // Check if content is a structured object (from image or other media upload)
            if (typeof content === 'object' && content !== null) {
                // Create reply structure from object
                const contentType = content.type || 'text';
                messageContent = messageContentService.createReplyContent(
                    originalMessage,
                    JSON.stringify(content),
                    contentType
                );
            } else {
                // It's a plain text message, create reply structure
                messageContent = messageContentService.createReplyContent(
                    originalMessage,
                    content,
                    'text'
                );
            }

            // First prepare local representation with placeholders for ID and timestamp
            const tempMessage: IMessage = {
                mid: -1, // Temporary ID that will be replaced
                sender_uid: currentUserId.value,
                receiver_uid: receiverId,
                content: messageContent, // Store the structured content with reply info
                nonce: '', // Will be filled in after server response
                timestamp: new Date() // Add timestamp to avoid type errors
            };

            // Add the unencrypted message to the displayed messages immediately
            const processedTempMessage = ensureValidDate(tempMessage);

            // Add to the list and re-sort
            messages.value = [...messages.value, processedTempMessage].sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeB - timeA;
            });

            // Smoothly scroll to show the new message
            smoothScrollToRecentMessages();

            // Now send the encrypted message to the server
            const newMessage = await apiService.sendMessage(
                currentUserId.value,
                receiverId,
                messageContent, // Send the JSON stringified content with reply info
                token.value
            );

            // Process the message to ensure valid date
            const processedMessage = ensureValidDate({ ...newMessage });

            // Create the actual message to store locally
            const storedMessage = {
                ...processedMessage,
                content: messageContent // Store the decrypted content as JSON string
            };

            // Find and replace the temporary message
            const tempIndex = messages.value.findIndex(m => 
                m.mid === -1 && 
                m.sender_uid === currentUserId.value && 
                m.receiver_uid === receiverId
            );
            
            if (tempIndex !== -1) {
                messages.value[tempIndex] = storedMessage;
            }

            // Save the message locally for offline access
            if (activeContactId.value) {
                await storageService.addMessageToContact(
                    currentUserId.value, 
                    receiverId,
                    storedMessage
                );
            }

            return storedMessage;
        } catch (err: any) {
            sendError.value = `Failed to send reply: ${err.message || 'Unknown error'}`;
            console.error('Error sending reply:', err);
            throw err;
        }
    }

    /**
     * Store messages for all contacts on the device for offline access
     */
    async function storeAllContactMessages(userId: number): Promise<boolean> {
        try {
            const contacts = await apiService.getContacts(userId, token.value);
            console.log('Storing messages for contacts:', contacts);

            for (const contact of contacts) {
                const contactId = contact.contactUserId;
                console.log(`Fetching messages for contact ${contactId}`);

                try {
                    const contactMessages = await apiService.getMessages(userId, contactId, token.value);

                    if (contactMessages && contactMessages.length > 0) {
                        // Store messages using our new method
                        await storageService.storeMessagesForContact(userId, contactId, contactMessages);
                        console.log(`Stored ${contactMessages.length} messages for contact ${contactId}`);
                    }
                } catch (contactError) {
                    console.error(`Error fetching messages for contact ${contactId}:`, contactError);
                }
            }
            return true;
        } catch (error) {
            console.error('Error storing all contact messages:', error);
            sendError.value = error instanceof Error ? error.message : 'Failed to store messages';
            return false;
        }
    }

    /**
     * Delete messages for a specific contact
     */
    async function deleteContactMessages(contactId: number): Promise<boolean> {
        try {
            if (!currentUserId.value) {
                throw new Error("Current user ID not available");
            }

            const result = await storageService.deleteMessagesForContact(currentUserId.value, contactId);

            // If deleting the active contact's messages, clear the displayed messages
            if (activeContactId.value === contactId) {
                messages.value = [];
            }

            return result;
        } catch (error) {
            console.error('Error deleting contact messages:', error);
            return false;
        }
    }

    /**
     * Delete all stored messages for all contacts
     */
    async function deleteAllMessages(): Promise<boolean> {
        try {
            await storageService.deleteAllMessages();

            // Clear displayed messages
            messages.value = [];

            return true;
        } catch (error) {
            console.error('Error deleting all messages:', error);
            return false;
        }
    }

    /**
     * Clear current displayed messages and error state
     */
    function clearMessages() {
        messages.value = [];
        error.value = undefined;
        sendError.value = undefined;
        activeContactId.value = null;
    }

    /**
     * Clear just the send error
     */
    function clearSendError() {
        sendError.value = undefined;
    }

    /**
     * Set the total number of message pages for the current conversation
     * @param total Total number of pages
     */
    function setTotalMessagePages(total: number) {
        totalMessagePages.value = total;
    }

    /**
     * Load paginated messages for a contact
     * @param contactId The contact's user ID
     * @param page Page number (0-based)
     * @param pageSize Number of messages per page
     */
    async function loadPaginatedMessages(contactId: number, page: number, pageSize: number) {
        if (!currentUserId.value) return;

        try {
            // First ensure we have all server messages
            if (page === 0) {
                await fetchMessages(contactId);
            }

            // Get paginated messages from local storage
            const paginatedData = await storageService.getMessagesForContactPaginated(
                currentUserId.value,
                contactId,
                page,
                pageSize
            );

            // Update total pages info
            totalMessagePages.value = paginatedData.totalPages;
            currentMessagePage.value = paginatedData.currentPage;

            // Only replace messages if loading the first page
            // otherwise append to existing messages
            if (page === 0) {
                messages.value = paginatedData.messages;
            } else {
                // Add older messages to the beginning (since messages are sorted newest first)
                messages.value = [...paginatedData.messages, ...messages.value];
            }

            // Update active contact if needed
            if (contactId !== activeContactId.value) {
                activeContactId.value = contactId;
            }
        } catch (error) {
            console.error('Error loading paginated messages:', error);
            throw error;
        }
    }

    /**
     * Optimize message storage to remove duplicates and improve performance
     * @param userId Current user ID
     * @param contactId Optional contact ID to optimize specific conversation
     * @returns Promise resolving to result of optimization
     */
    async function optimizeMessageStorage(userId: number, contactId?: number) {
        return await storageService.optimizeMessageStorage(userId, contactId);
    }

    return {
        messages,
        isLoading,
        error,
        sendError,
        fetchMessages,
        sendMessage,
        replyToMessage,
        clearMessages,
        clearSendError,
        storeAllContactMessages,
        deleteContactMessages,
        deleteAllMessages,
        currentUserId,
        activeContactId,
        loadPaginatedMessages,
        setTotalMessagePages,
        totalMessagePages,
        currentMessagePage,
        optimizeMessageStorage,
        deleteLocalMessage
    };
});
