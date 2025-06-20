import { DateFormatService } from '@/services/date-format.service'
import { messageContentService } from '@/services/message-content.service'
import type { IMessage } from '@/models/message-model'

/**
 * Format the message time for display
 */
export function formatTimeForMessage(dateString: string | Date | undefined): string {
  return DateFormatService.formatMessageTime(dateString) || ''
}

/**
 * Check if a message contains only emoji
 */
export function isEmojiOnly(text: string): boolean {
  const emojiRegex = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Emoji_Component}|\s)+$/u
  return emojiRegex.test(text)
}

/**
 * Count emojis in a string
 */
export function countEmojis(text: string): number {
  const emojiMatches = text.match(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\p{Emoji_Modifier}|\u200D\p{Emoji})*|\s+/gu)
  return emojiMatches ? emojiMatches.filter(match => match.trim().length > 0).length : 0
}

/**
 * Get emoji message style class based on emoji count
 */
export function getEmojiMessageStyle(text: string): string | null {
  if (!text || !isEmojiOnly(text)) {
    return null
  }
  const count = countEmojis(text)
  if (count === 1) {
    return 'emoji-only emoji-single'
  } else if (count <= 3) {
    return 'emoji-only emoji-few'
  } else {
    return 'emoji-only emoji-many'
  }
}

/**
 * Get message content from the message object
 */
export function getMessageContent(message: IMessage): string {
  return messageContentService.getMessageContent(message)
}

/**
 * Determine if a message is an image
 */
export function isImageMessage(content: string): boolean {
  return messageContentService.isImageMessage(content)
}

/**
 * Get the image source for an image message
 */
export function getImageSource(message: IMessage): string | null {
  return messageContentService.getImageSource(message)
}

/**
 * Get the image name for an image message
 */
export function getImageName(message: IMessage): string {
  return messageContentService.getImageName(message)
}

/**
 * Get the image size for an image message
 */
export function getImageSize(message: IMessage): string {
  return messageContentService.getImageSize(message)
}

/**
 * Format audio duration for display
 */
export function formatAudioTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

/**
 * Get file source from message
 */
export function getFileSource(message: IMessage): string | null {
  return messageContentService.getFileSource(message)
}

/**
 * Determine if a message is a document
 */
export function isDocumentMessage(content: string): boolean {
  return messageContentService.isDocumentMessage(content)
}

/**
 * Get document name from message
 */
export function getDocumentName(message: IMessage): string {
  return messageContentService.getDocumentName(message)
}

/**
 * Get document size from message
 */
export function getDocumentSize(message: IMessage): string {
  return messageContentService.getDocumentSize(message)
}

/**
 * Determine if a message is an audio
 */
export function isAudioMessage(content: string): boolean {
  return messageContentService.isAudioMessage(content)
}

/**
 * Get audio source from message
 */
export function getAudioSource(message: IMessage): string | null {
  return messageContentService.getAudioSource(message)
}

/**
 * Get audio extension from message
 */
export function getAudioExtension(message: IMessage): string {
  return messageContentService.getAudioExtension(message)
}

/**
 * Get audio name from message
 */
export function getAudioName(message: IMessage): string {
  return messageContentService.getAudioName(message)
}

/**
 * Get audio duration from message
 */
export function getAudioDuration(message: IMessage): number {
  return messageContentService.getAudioDuration(message)
}

/**
 * Determine if a message is code
 */
export function isCodeMessage(content: string): boolean {
  return messageContentService.isCodeMessage(content)
}

/**
 * Format code for display
 */
export function formatCode(content: string, language: string): string {
  return messageContentService.formatCode(content, language)
}

/**
 * Get code content from message
 */
export function getCodeContent(message: IMessage): string {
  return messageContentService.getCodeContent(message)
}

/**
 * Get code language from message
 */
export function getCodeLanguage(message: IMessage): string {
  return messageContentService.getCodeLanguage(message)
}

/**
 * Get code name from message
 */
export function getCodeName(message: IMessage): string {
  return messageContentService.getCodeName(message)
}

/**
 * Get code size from message
 */
export function getCodeSize(message: IMessage): string {
  return messageContentService.getCodeSize(message)
}

/**
 * Determine the position of a message in a group (first, middle, last, or single)
 */
export function getMessagePosition(message: IMessage, group: { sender: number, messages: IMessage[], minute: string }) {
  if (group.messages.length === 1) return 'single'
  const index = group.messages.findIndex(m => m.mid === message.mid)
  if (index === 0) return 'first'
  if (index === group.messages.length - 1) return 'last'
  return 'middle'
}

/**
 * Create minute-based groups of messages
 */
export function createMinuteGroups(messages: IMessage[]) {
  const minuteGroups: Array<{ sender: number, messages: IMessage[], minute: string }> = []
  let currentSender: number | null = null
  let currentMinute: string | null = null
  let currentGroup: IMessage[] = []
  
  for (const message of messages) {
    const timestamp = new Date(message.timestamp)
    const minute = `${timestamp.getHours()}:${timestamp.getMinutes()}`
    
    if (currentMinute !== minute || currentSender !== message.sender_uid) {
      if (currentMinute !== null) {
        minuteGroups.push({
          sender: currentSender!,
          minute: currentMinute,
          messages: [...currentGroup]
        })
      }
      currentMinute = minute
      currentSender = message.sender_uid
      currentGroup = [message]
    } else {
      currentGroup.push(message)
    }
  }
  
  if (currentGroup.length > 0 && currentMinute !== null) {
    minuteGroups.push({
      sender: currentSender!,
      minute: currentMinute,
      messages: [...currentGroup]
    })
  }
  
  return minuteGroups
}
