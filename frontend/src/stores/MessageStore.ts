import { defineStore } from 'pinia'
import { ref, computed, onUnmounted, watchEffect } from 'vue'
import type { IMessage } from '@/models/message-model'
import { ApiService, apiService } from '@/services/api.service'
import { StorageService, storageService } from '@/services/storage.service'
import { websocketService } from '@/services/websocket.service'
import type { Contact } from '@/models/contact-model'

export const useMessageStore = defineStore('messages', () => {
    // State
    const messages = ref<IMessage[]>([])
    const isLoading = ref(false)
    const error = ref<string | undefined>(undefined)
    const sendError = ref<string | undefined>(undefined)
    const activeContactId = ref<number | null>(null)

    // Get user ID and token from storage service
    const user = storageService.getUser()
    const currentUserId = computed(() => user?.uid || 0)
    const token = computed(() => storageService.getToken() || '')

    // Connect to WebSocket when store is created
    if (currentUserId.value && token.value) {
        websocketService.connect(currentUserId.value, token.value)
    }

    // Message handler for real-time updates
    const handleNewMessage = (message: IMessage) => {
        // Only add the message if it belongs to the current conversation
        if (activeContactId.value !== null &&
            ((message.sender_uid === currentUserId.value && message.receiver_uid === activeContactId.value) ||
                (message.sender_uid === activeContactId.value && message.receiver_uid === currentUserId.value))) {

            // Process the message to ensure valid date
            const processedMessage = ensureValidDate(message)

            // Add to messages if not already present
            const messageExists = messages.value.some(m => m.mid === message.mid)

            if (!messageExists) {
                messages.value = [...messages.value, processedMessage].sort((a, b) => {
                    const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                    const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                    return timeB - timeA;
                })

                // Smoothly scroll to show the new message
                smoothScrollToRecentMessages()
            }
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

    /**
     * Fetch messages between current user and a contact
     */
    async function fetchMessages(contactUserId: number) {
        error.value = undefined
        isLoading.value = true
        messages.value = [] // Clear previous messages
        activeContactId.value = contactUserId // Set active contact

        try {
            const fetchedMessages = await apiService.getMessages(currentUserId.value, contactUserId, token.value)

            // Process all messages to ensure valid dates
            const processedMessages = fetchedMessages.map(ensureValidDate)

            // Sort messages
            messages.value = processedMessages.sort((a, b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            })

            // Just position to the end without scrolling animation
            positionToRecentMessages()

        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load messages'
            console.error('Error fetching messages:', err)
        } finally {
            isLoading.value = false
        }
    }

    /**
     * Send a new message to a contact
     */
    async function sendMessage(receiverId: number, content: string) {
        // Clear any previous send errors
        sendError.value = undefined

        try {
            // Send the message through the API service
            const newMessage = await apiService.sendMessage(
                currentUserId.value,
                receiverId,
                content,
                token.value
            )

            // Add the new message to the list and re-sort
            messages.value = [...messages.value, newMessage].sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeB - timeA;
            })

            // Smoothly scroll to show the new message
            smoothScrollToRecentMessages()

            return newMessage
        } catch (err) {
            console.error('Error sending message:', err)
            sendError.value = err instanceof Error ? err.message : 'Failed to send message'
            throw err
        }
    }

    async function storeMessagesOnDevice(userId: number): Promise<boolean> {

        const contactsId: Contact[] = await apiService.getContacts(userId, token.value);

        try {
            contactsId.forEach(async contact => {
                const contactId = contact.contactUserId;
                const messages = await apiService.getMessages(userId, contactId, token.value);
                await storageService.storeMessages(messages);
            });
        }
        catch (error) {
            console.error('Error sending Message', error)
            sendError.value = error instanceof Error ? error.message : 'Failed to send message'
            throw error
        } finally {
            return true;
        }
    }

    /**
     * Clear all messages and error state
     */
    function clearMessages() {
        messages.value = []
        error.value = undefined
        sendError.value = undefined
        activeContactId.value = null
    }

    /**
     * Clear just the send error
     */
    function clearSendError() {
        sendError.value = undefined
    }

    return {
        messages,
        isLoading,
        error,
        sendError,
        fetchMessages,
        sendMessage,
        clearMessages,
        clearSendError,
        storeMessagesOnDevice,
        currentUserId
    }
})
