import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IMessage } from '@/models/message-model'
import { apiService } from '@/services/api.service'
import { storageService } from '@/services/storage.service'

export const useMessageStore = defineStore('messages', () => {
    // State
    const messages = ref<IMessage[]>([])
    const isLoading = ref(false)
    const error = ref<string | undefined>(undefined)
    const sendError = ref<string | undefined>(undefined) // New state for send-related errors

    // Get user ID and token from storage service
    const user = storageService.getUser()
    const currentUserId = computed(() => user?.uid || 0)
    const token = computed(() => storageService.getToken() || '')

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
     * Scroll to the most recent messages
     */
    function scrollToRecentMessages() {
        setTimeout(() => {
            const messageContainer = document.querySelector('.flex.flex-col-reverse.space-y-reverse.space-y-4')
            if (messageContainer) {
                messageContainer.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end',
                    inline: 'nearest'
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

        try {
            const fetchedMessages = await apiService.getMessages(currentUserId.value, contactUserId, token.value)
            
            // Process all messages to ensure valid dates
            const processedMessages = fetchedMessages.map(ensureValidDate)
            
            // Sort messages
            messages.value = processedMessages.sort((a, b) => {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            })

            // Automatically scroll to the recent messages
            scrollToRecentMessages()

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
            
            // The API service now handles timestamp validation and sender_uid correction,
            // so we can directly add the message to our list
            
            // Add the new message to the list and re-sort
            messages.value = [...messages.value, newMessage].sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeB - timeA;
            })
            
            // Scroll to show the new message
            scrollToRecentMessages()
            
            return newMessage
        } catch (err) {
            console.error('Error sending message:', err)
            sendError.value = err instanceof Error ? err.message : 'Failed to send message'
            throw err
        }
    }

    /**
     * Clear all messages and error state
     */
    function clearMessages() {
        messages.value = []
        error.value = undefined
        sendError.value = undefined
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
        currentUserId
    }
})
