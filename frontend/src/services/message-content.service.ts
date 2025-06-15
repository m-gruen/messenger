import type { IMessage } from '@/models/message-model';
import hljs from 'highlight.js';

export interface IParsedMessageContent {
    type: string;
    content: string;
    format?: string;
    name?: string;
    size?: number;
    duration?: number;
    language?: string;
}

export class MessageContentService {
    /**
     * Parse raw message content string into structured message content
     * Simplified to handle the most common cases without nested try-catch blocks
     */
    parseMessageContent(content: string): IParsedMessageContent {
        if (!content) {
            return { type: 'text', content: '' };
        }

        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object' && 'type' in parsed) {
                if (parsed.type === 'code' && parsed.content) {
                    parsed.content = this.decodeHtmlEntities(parsed.content);
                }
                return parsed;
            }
        } catch (e) {
            const preprocessed = this.decodeHtmlEntities(content);
            
            try {
                const parsed = JSON.parse(preprocessed);
                if (parsed && typeof parsed === 'object' && 'type' in parsed) {
                    return parsed;
                }
            } catch (preprocessError) {
                console.log('Failed to parse message content as JSON:', e);
            }
        }
        
        return { type: 'text', content };
    }

    /**
     * Extract text content from message
     */
    getMessageContent(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            return parsed.type === 'text' ? parsed.content : '';
        } catch (e) {
            return message.content;
        }
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    /**
     * Check if message is an image type
     */
    isImageMessage(content: string): boolean {
        try {
            const parsed = this.parseMessageContent(content);
            return parsed.type === 'image';
        } catch (e) {
            return false;
        }
    }

    /**
     * Get image source URL
     */
    getImageSource(message: IMessage): string | null {
        try {
            const parsed = this.parseMessageContent(message.content);
            if (parsed.type === 'image' && parsed.content && parsed.format) {
                return `data:${parsed.format};base64,${parsed.content}`;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get image filename
     */
    getImageName(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            return parsed.type === 'image' && parsed.name ? parsed.name : 'image.jpg';
        } catch (e) {
            return 'image.jpg';
        }
    }

    /**
     * Get formatted image size
     */
    getImageSize(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            if (parsed.type === 'image' && parsed.size) {
                return this.formatFileSize(parsed.size);
            }
            return '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Check if message is a document type
     */
    isDocumentMessage(content: string): boolean {
        try {
            const parsed = this.parseMessageContent(content);
            return parsed.type === 'document';
        } catch (e) {
            return false;
        }
    }

    /**
     * Get document filename
     */
    getDocumentName(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            return parsed.type === 'document' && parsed.name ? parsed.name : 'document.pdf';
        } catch (e) {
            return 'document.pdf';
        }
    }

    /**
     * Get formatted document size
     */
    getDocumentSize(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            if (parsed.type === 'document' && parsed.size) {
                return this.formatFileSize(parsed.size);
            }
            return '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Get file source URL for download
     */
    getFileSource(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            if ((parsed.type === 'document' || parsed.type === 'code') && parsed.content) {
                return `data:${parsed.format || 'application/octet-stream'};base64,${parsed.content}`;
            }
            if (parsed.type === 'code' && parsed.content) {
                return `data:text/plain;charset=utf-8,${encodeURIComponent(parsed.content)}`;
            }
            return '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Check if message is an audio type
     */
    isAudioMessage(content: string): boolean {
        try {
            const parsed = this.parseMessageContent(content);
            return parsed.type === 'audio';
        } catch (e) {
            return false;
        }
    }

    /**
     * Get audio source URL
     */
    getAudioSource(message: IMessage): string | null {
        try {
            const parsed = this.parseMessageContent(message.content);
            if (parsed.type === 'audio' && parsed.content && parsed.format) {
                return `data:${parsed.format};base64,${parsed.content}`;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get audio file extension from format
     */
    getAudioExtension(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            if (parsed.type === 'audio' && parsed.format) {
                const mimeType = parsed.format.toLowerCase();
                if (mimeType.includes('mp3')) return 'mp3';
                if (mimeType.includes('wav')) return 'wav';
                if (mimeType.includes('ogg')) return 'ogg';
                if (mimeType.includes('m4a')) return 'm4a';
                return 'mp3';
            }
            return 'mp3';
        } catch (e) {
            return 'mp3';
        }
    }

    /**
     * Format audio time display
     */
    formatAudioTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Check if message is a code type
     */
    isCodeMessage(content: string): boolean {
        try {
            const parsed = this.parseMessageContent(content);
            return parsed.type === 'code';
        } catch (e) {
            return false;
        }
    }

    /**
     * Format and highlight code for display
     */
    formatCode(code: string, language: string): string {
        try {
            const decodedCode = this.decodeHtmlEntities(code);
            
            if (language && hljs.getLanguage(language)) {
                return hljs.highlight(decodedCode, { language }).value;
            } else {
                return hljs.highlightAuto(decodedCode).value;
            }
        } catch (e) {
            console.error('Error highlighting code:', e);
            return code;
        }
    }

    /**
     * Get code content from message
     */
    getCodeContent(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            if (parsed.type === 'code' && parsed.content) {
                return this.decodeHtmlEntities(parsed.content);
            }
            return '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Get programming language for code message
     */
    getCodeLanguage(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            return parsed.type === 'code' && parsed.language ? parsed.language : 'plaintext';
        } catch (e) {
            return 'plaintext';
        }
    }

    /**
     * Get code file name
     */
    getCodeName(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            return parsed.type === 'code' && parsed.name ? parsed.name : 'code.txt';
        } catch (e) {
            return 'code.txt';
        }
    }

    /**
     * Get formatted code file size
     */
    getCodeSize(message: IMessage): string {
        try {
            const parsed = this.parseMessageContent(message.content);
            if (parsed.type === 'code' && parsed.size) {
                return this.formatFileSize(parsed.size);
            }
            return '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Helper method to decode HTML entities
     * Made public so it can be used directly by components
     */
    public decodeHtmlEntities(text: string): string {
        return text
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&#034;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }
}

export const messageContentService = new MessageContentService();
