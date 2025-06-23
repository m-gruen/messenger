import { ref } from 'vue'
import type { IImageMessageContent, IDocumentMessageContent, IAudioMessageContent, ICodeMessageContent } from '@/models/message-model'

// Using the more generic notification handler to maintain compatibility with both old and new systems
export function useFileHandler(showNotification: (message: string, type: string) => void) {
    const isUploading = ref(false)

    // Handle image upload
    async function handleImageUpload(
        event: Event,
        compressImage: (file: File) => Promise<string>,
        onSend: (content: IImageMessageContent) => void,
        resetInput: () => void
    ) {
        const input = event.target as HTMLInputElement
        const files = input.files

        if (!files || !files.length) return

        const file = files[0]

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error')
            // Reset file input to allow re-selection
            input.value = ''
            return
        }

        // Check initial file size
        const MAX_SIZE = 10 * 1024 * 1024 // 10MB
        if (file.size > MAX_SIZE) {
            showNotification('Image size should not exceed 10MB', 'error')
            // Reset file input to allow re-selection
            input.value = ''
            return
        }

        isUploading.value = true

        try {
            // Compress and process image
            const compressedDataUrl = await compressImage(file)

            // Extract base64 data and format from data URL
            const base64Data = compressedDataUrl.split(',')[1] // Remove the "data:image/jpeg;base64," part
            const format = compressedDataUrl.split(';')[0].split(':')[1] // Extract MIME type

            // Create an image message content object
            const messageContent: IImageMessageContent = {
                type: 'image',
                format: format,
                content: base64Data,
                name: file.name,
                size: file.size
            }

            onSend(messageContent)
        } catch (error) {
            console.error('Image compression failed:', error)
            showNotification('Failed to process the image. Please try a smaller image.', 'error')
        } finally {
            isUploading.value = false

            // Reset file input
            input.value = ''
            resetInput()
        }
    }

    // Handle document upload
    function handleDocumentUpload(
        event: Event,
        onSend: (content: IDocumentMessageContent) => void,
        resetInput: () => void
    ) {
        const input = event.target as HTMLInputElement
        const files = input.files

        if (!files || !files.length) return

        const file = files[0]

        // Check file size
        const MAX_SIZE = 10 * 1024 * 1024 // 10MB
        if (file.size > MAX_SIZE) {
            showNotification('Document size should not exceed 10MB', 'error')
            // Reset file input to allow re-selection
            input.value = ''
            return
        }

        isUploading.value = true

        // Read the file as base64
        const reader = new FileReader()

        reader.onload = () => {
            const base64Data = reader.result?.toString().split(',')[1] // Get base64 data

            if (!base64Data) {
                showNotification('Failed to read document', 'error')
                isUploading.value = false
                return
            }

            // Create a document message content object
            const messageContent: IDocumentMessageContent = {
                type: 'document',
                format: file.type,
                content: base64Data,
                name: file.name,
                size: file.size
            }

            onSend(messageContent)
            isUploading.value = false

            // Reset file input
            input.value = ''
            resetInput()
        }

        reader.onerror = () => {
            console.error('Error reading file')
            showNotification('Failed to read document file', 'error')
            isUploading.value = false

            // Reset file input
            input.value = ''
            resetInput()
        }

        reader.readAsDataURL(file)
    }

    // Handle audio upload
    async function handleAudioUpload(
        event: Event,
        onSend: (content: IAudioMessageContent) => void,
        resetInput: () => void
    ) {
        const input = event.target as HTMLInputElement
        const files = input.files

        if (!files || !files.length) return

        const file = files[0]

        // Check file size
        const MAX_SIZE = 10 * 1024 * 1024 // 10MB
        if (file.size > MAX_SIZE) {
            showNotification('Audio size should not exceed 10MB', 'error')
            // Reset file input to allow re-selection
            input.value = ''
            return
        }

        isUploading.value = true

        const reader = new FileReader()

        reader.onload = async () => {
            const base64Data = reader.result?.toString().split(',')[1] // Get base64 data

            if (!base64Data) {
                showNotification('Failed to read audio file', 'error')
                isUploading.value = false
                return
            }

            // Get audio duration if possible
            const getAudioDuration = () => {
                return new Promise<number>((resolve) => {
                    try {
                        const audio = new Audio()
                        audio.src = URL.createObjectURL(file)

                        audio.addEventListener('loadedmetadata', () => {
                            const duration = audio.duration
                            URL.revokeObjectURL(audio.src) // Clean up
                            resolve(isNaN(duration) ? 0 : duration)
                        })

                        // Handle errors or timeouts
                        audio.addEventListener('error', () => resolve(0))
                        setTimeout(() => resolve(0), 3000) // Timeout after 3 seconds
                    } catch (err) {
                        console.error('Error getting audio duration:', err)
                        resolve(0)
                    }
                })
            }

            // Get duration and create message
            const audioDuration = await getAudioDuration()

            // Create an audio message content object
            const messageContent: IAudioMessageContent = {
                type: 'audio',
                format: file.type,
                content: base64Data,
                name: file.name,
                duration: audioDuration
            }

            onSend(messageContent)
            isUploading.value = false

            // Reset file input
            input.value = ''
            resetInput()
        }

        reader.onerror = () => {
            console.error('Error reading audio file')
            showNotification('Failed to read audio file', 'error')
            isUploading.value = false

            // Reset file input
            input.value = ''
            resetInput()
        }

        reader.readAsDataURL(file)
    }

    // Handle code file upload
    function handleCodeUpload(
        event: Event,
        getLanguageFromExtension: (extension: string) => string,
        onSend: (content: ICodeMessageContent) => void,
        resetInput: () => void
    ) {
        const input = event.target as HTMLInputElement
        const files = input.files

        if (!files || !files.length) return

        const file = files[0]

        // Check file size
        const MAX_SIZE = 10 * 1024 * 1024 // 10MB
        if (file.size > MAX_SIZE) {
            showNotification('Code file size should not exceed 10MB', 'error')
            // Reset file input to allow re-selection
            input.value = ''
            return
        }

        isUploading.value = true

        // Read the file as text
        const reader = new FileReader()

        reader.onload = () => {
            const content = reader.result?.toString()

            if (!content) {
                showNotification('Failed to read code file', 'error')
                isUploading.value = false
                return
            }

            // Detect language from file extension
            const extension = file.name.split('.').pop()?.toLowerCase() || ''
            const language = getLanguageFromExtension(extension)

            // Create a code message content object
            const messageContent: ICodeMessageContent = {
                type: 'code',
                language: language,
                content: content,
                name: file.name,
                size: file.size
            }

            onSend(messageContent)
            isUploading.value = false

            // Reset file input
            input.value = ''
            resetInput()
        }

        reader.onerror = () => {
            console.error('Error reading code file')
            showNotification('Failed to read code file', 'error')
            isUploading.value = false

            // Reset file input
            input.value = ''
            resetInput()
        }

        reader.readAsText(file)
    }

    return {
        isUploading,
        handleImageUpload,
        handleDocumentUpload,
        handleAudioUpload,
        handleCodeUpload
    }
}
