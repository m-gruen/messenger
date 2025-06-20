import { ref } from 'vue'

export function useFileUpload() {
    const fileInputRef = ref<HTMLInputElement | null>(null)
    const documentInputRef = ref<HTMLInputElement | null>(null)
    const audioInputRef = ref<HTMLInputElement | null>(null)
    const codeInputRef = ref<HTMLInputElement | null>(null)
    const isUploading = ref(false)

    // Trigger file input clicks
    function triggerFileUpload() {
        if (fileInputRef.value) {
            fileInputRef.value.click()
        }
    }

    function triggerDocumentUpload() {
        if (documentInputRef.value) {
            documentInputRef.value.click()
        }
    }

    function triggerAudioUpload() {
        if (audioInputRef.value) {
            audioInputRef.value.click()
        }
    }

    function triggerCodeUpload() {
        if (codeInputRef.value) {
            codeInputRef.value.click()
        }
    }

    // Compress image to avoid payload too large errors
    function compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            // Create a FileReader to read the file
            const reader = new FileReader();

            reader.onload = (event) => {
                // Create an image to calculate dimensions
                const img = new Image();

                img.onload = () => {
                    // Create a canvas to draw and resize the image
                    const canvas = document.createElement('canvas');

                    // Calculate new dimensions while maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;

                    // Target width, reduce size if needed
                    const MAX_WIDTH = 1280; // Reduced from original if larger

                    if (width > MAX_WIDTH) {
                        const ratio = MAX_WIDTH / width;
                        width = MAX_WIDTH;
                        height = height * ratio;
                    }

                    // Set canvas size
                    canvas.width = width;
                    canvas.height = height;

                    // Draw image on canvas with new dimensions
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    // Get the compressed data URL (JPEG format with reduced quality)
                    // Using JPEG for better compression
                    const quality = 0.7; // 70% quality - good balance between size and quality
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

                    resolve(compressedDataUrl);
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };

                img.src = event.target?.result as string;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
    }

    // Detect language from file extension
    function getLanguageFromExtension(extension: string): string {
        // Map common file extensions to language names recognized by highlight.js
        const languageMap: { [key: string]: string } = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'java': 'java',
            'html': 'html',
            'css': 'css',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'sh': 'bash',
            'bat': 'batch',
            'ps1': 'powershell',
            'sql': 'sql',
            'json': 'json',
            'xml': 'xml',
            'md': 'markdown',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'vue': 'html'
            // Add more as needed
        }

        return languageMap[extension] || 'plaintext'
    }

    return {
        fileInputRef,
        documentInputRef,
        audioInputRef,
        codeInputRef,
        isUploading,
        triggerFileUpload,
        triggerDocumentUpload,
        triggerAudioUpload,
        triggerCodeUpload,
        compressImage,
        getLanguageFromExtension
    }
}
