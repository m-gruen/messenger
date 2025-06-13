<script setup lang="ts">
import { defineProps, computed, ref, onMounted, nextTick, watch } from 'vue'
import type { IMessage } from '@/models/message-model'
import { MessageSquare, ArrowDown, FileText, Download, Play, Pause, Code } from 'lucide-vue-next'
import { DateFormatService } from '@/services/date-format.service'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

const props = defineProps({
  messages: {
    type: Array as () => IMessage[],
    default: () => []
  },
  currentUserId: {
    type: Number,
    required: true
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: undefined
  },
  contactUsername: {
    type: String,
    required: true
  }
})

const emit = defineEmits<{
  'load-more-messages': [],
  'view-image': [src: string | null],
  'view-code': [content: string, language: string, name: string],
  'download-file': [src: string | null, filename: string]
}>();

const messageListRef = ref<HTMLElement | null>(null);
const isViewingOlderMessages = ref(false);
const scrollThreshold = 3000;
const notificationOpacity = ref(0);
const isLoadingMore = ref(false);
const loadMoreThreshold = 100;

const handleScroll = () => {
  if (!messageListRef.value) return;
  const { scrollTop, scrollHeight, clientHeight } = messageListRef.value;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  const distanceFromTop = scrollTop;
  if (distanceFromTop < loadMoreThreshold && !isLoadingMore.value && !props.isLoading) {
    isLoadingMore.value = true;
    emit('load-more-messages');
    setTimeout(() => {
      isLoadingMore.value = false;
    }, 3000);
  }
  if (distanceFromBottom > scrollThreshold) {
    isViewingOlderMessages.value = true;
    const extraScroll = distanceFromBottom - scrollThreshold;
    notificationOpacity.value = Math.min(1, extraScroll / 100);
  } else {
    isViewingOlderMessages.value = false;
    notificationOpacity.value = 0;
  }
};

const scrollToLatest = () => {
  if (!messageListRef.value) return;
  messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
  isViewingOlderMessages.value = false;
  notificationOpacity.value = 0;
};

watch(() => props.messages, async (newMessages, oldMessages) => {
  if (!isViewingOlderMessages.value || (oldMessages && newMessages && newMessages.length > oldMessages.length)) {
    await nextTick();
    scrollToLatest();
  }
}, { deep: true });

watch(() => props.contactUsername, () => {
  isViewingOlderMessages.value = false;
  notificationOpacity.value = 0;
  nextTick(() => {
    scrollToLatest();
  });
});

onMounted(() => {
  if (messageListRef.value) {
    messageListRef.value.addEventListener('scroll', handleScroll);
    scrollToLatest();
  }
});

const messageGroups = computed(() => {
  if (!props.messages.length) return []
  const groups: { dateLabel: string, dateValue: string, messages: IMessage[], minuteGroups: Array<{ sender: number, messages: IMessage[], minute: string }> }[] = []
  let currentDate: string | null = null
  let currentMessages: IMessage[] = []
  const sortedMessages = [...props.messages].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime()
    const dateB = new Date(b.timestamp).getTime()
    return dateA - dateB
  })
  for (const message of sortedMessages) {
    const timestamp = new Date(message.timestamp)
    const messageDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate())
    const dateString = messageDate.toISOString().split('T')[0]
    if (currentDate !== dateString) {
      if (currentDate !== null) {
        groups.push({
          dateLabel: currentMessages[0] ? DateFormatService.formatRelativeDate(new Date(currentMessages[0].timestamp)) : '',
          dateValue: currentDate,
          messages: [...currentMessages],
          minuteGroups: createMinuteGroups(currentMessages)
        })
      }
      currentDate = dateString
      currentMessages = [message]
    } else {
      currentMessages.push(message)
    }
  }
  if (currentMessages.length > 0) {
    groups.push({
      dateLabel: currentMessages[0] ? DateFormatService.formatRelativeDate(new Date(currentMessages[0].timestamp)) : '',
      dateValue: currentDate!,
      messages: [...currentMessages],
      minuteGroups: createMinuteGroups(currentMessages)
    })
  }
  return groups
})

function createMinuteGroups(messages: IMessage[]) {
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

function getMessagePosition(message: IMessage, group: { sender: number, messages: IMessage[], minute: string }) {
  if (group.messages.length === 1) return 'single'
  const index = group.messages.findIndex(m => m.mid === message.mid)
  if (index === 0) return 'first'
  if (index === group.messages.length - 1) return 'last'
  return 'middle'
}

function formatTimeForMessage(dateString: string | Date | undefined): string {
  return DateFormatService.formatMessageTime(dateString) || '';
}

function isEmojiOnly(text: string): boolean {
  const emojiRegex = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Emoji_Component}|\s)+$/u;
  return emojiRegex.test(text);
}

function countEmojis(text: string): number {
  const emojiMatches = text.match(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\p{Emoji_Modifier}|\u200D\p{Emoji})*|\s+/gu);
  return emojiMatches ? emojiMatches.filter(match => match.trim().length > 0).length : 0;
}

function getEmojiMessageStyle(text: string): string | null {
  if (!text || !isEmojiOnly(text)) {
    return null;
  }
  const count = countEmojis(text);
  if (count === 1) {
    return 'emoji-only emoji-single';
  } else if (count <= 3) {
    return 'emoji-only emoji-few';
  } else if (count <= 8) {
    return 'emoji-only emoji-several';
  } else {
    return null;
  }
}

function parseMessageContent(content: string): {
  type: string,
  content: string,
  format?: string,
  name?: string,
  size?: number,
  duration?: number,
  language?: string
} {
  if (!content) {
    return { type: 'text', content: '' };
  }
  
  try {
    // First try: direct parse
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      // If this is a code message, make sure the content has all HTML entities decoded
      if (parsed.type === 'code' && parsed.content) {
        parsed.content = parsed.content
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&#034;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
      }
      return parsed;
    }
  } catch (e) {
    try {
      // Second try: handle possible HTML entity encoding
      // Replace HTML entities that might interfere with JSON parsing
      const preprocessed = content
        .replace(/&quot;/g, '"')
        .replace(/&#034;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'");
      
      const parsed = JSON.parse(preprocessed);
      if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        return parsed;
      }
    } catch (preprocessError) {
      try {
        // Third try: double-decoding approach (last resort)
        const doubleDecoded = JSON.parse(JSON.stringify(content));
        const parsed = JSON.parse(doubleDecoded);
        if (parsed && typeof parsed === 'object' && 'type' in parsed) {
          if (parsed.type === 'code' && parsed.content) {
            parsed.content = parsed.content
              .replace(/&quot;/g, '"')
              .replace(/&#039;/g, "'")
              .replace(/&#034;/g, '"')
              .replace(/&#x27;/g, "'")
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&');
          }
          return parsed;
        }
      } catch (nestedError) {
        console.log('Failed to parse message content as JSON:', e);
      }
    }
  }
  return { type: 'text', content };
}

function getMessageContent(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
    return parsed.type === 'text' ? parsed.content : '';
  } catch (e) {
    return message.content;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function isImageMessage(content: string): boolean {
  try {
    const parsed = parseMessageContent(content);
    return parsed.type === 'image';
  } catch (e) {
    return false;
  }
}

function getImageSource(message: IMessage): string | null {
  try {
    const parsed = parseMessageContent(message.content);
    if (parsed.type === 'image' && parsed.content && parsed.format) {
      return `data:${parsed.format};base64,${parsed.content}`;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getImageName(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
    return parsed.type === 'image' && parsed.name ? parsed.name : 'image.jpg';
  } catch (e) {
    return 'image.jpg';
  }
}

function getImageSize(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
    if (parsed.type === 'image' && parsed.size) {
      return formatFileSize(parsed.size);
    }
    return '';
  } catch (e) {
    return '';
  }
}

function isDocumentMessage(content: string): boolean {
  try {
    const parsed = parseMessageContent(content);
    return parsed.type === 'document';
  } catch (e) {
    return false;
  }
}

function getDocumentName(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
    return parsed.type === 'document' && parsed.name ? parsed.name : 'document.pdf';
  } catch (e) {
    return 'document.pdf';
  }
}

function getDocumentSize(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
    if (parsed.type === 'document' && parsed.size) {
      return formatFileSize(parsed.size);
    }
    return '';
  } catch (e) {
    return '';
  }
}

function getFileSource(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
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

function isAudioMessage(content: string): boolean {
  try {
    const parsed = parseMessageContent(content);
    return parsed.type === 'audio';
  } catch (e) {
    return false;
  }
}

function getAudioSource(message: IMessage): string | null {
  try {
    const parsed = parseMessageContent(message.content);
    if (parsed.type === 'audio' && parsed.content && parsed.format) {
      return `data:${parsed.format};base64,${parsed.content}`;
    }
    return null;
  } catch (e) {
    return null;
  }
}

function getAudioExtension(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
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

const audioState = ref({
  messageId: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0
});

function formatAudioTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function toggleAudioPlayback(message: IMessage): void {
  const audioElements = document.querySelectorAll('audio');
  const currentAudio = document.querySelector(`audio[data-message-id="${message.mid}"]`) as HTMLAudioElement;
  if (!currentAudio) return;
  audioElements.forEach(audio => {
    if (audio !== currentAudio && !audio.paused) {
      audio.pause();
    }
  });
  if (audioState.value.messageId === message.mid && audioState.value.isPlaying) {
    currentAudio.pause();
    audioState.value.isPlaying = false;
  } else {
    currentAudio.play();
    audioState.value.messageId = message.mid;
    audioState.value.isPlaying = true;
    if (!audioState.value.duration) {
      audioState.value.duration = currentAudio.duration;
    }
  }
}

function handleTimeUpdate(message: IMessage, event: Event): void {
  if (audioState.value.messageId === message.mid) {
    const audio = event.target as HTMLAudioElement;
    audioState.value.currentTime = audio.currentTime;
  }
}

function handleAudioMetadata(message: IMessage, event: Event): void {
  const audio = event.target as HTMLAudioElement;
  if (audio && audio.duration && audioState.value.messageId === message.mid) {
    audioState.value.duration = audio.duration;
  }
}

function handleAudioEnded(message: IMessage): void {
  if (audioState.value.messageId === message.mid) {
    audioState.value.isPlaying = false;
    audioState.value.currentTime = 0;
  }
}

function setAudioPosition(event: MouseEvent, message: IMessage): void {
  const target = event.currentTarget as HTMLElement;
  if (!target) return;
  const audio = document.querySelector(`audio[data-message-id="${message.mid}"]`) as HTMLAudioElement;
  if (!audio) return;
  const rect = target.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = clickX / rect.width;
  const newTime = percentage * audio.duration;
  audio.currentTime = newTime;
  audioState.value.currentTime = newTime;
  if (audio.paused) {
    audio.play();
    audioState.value.messageId = message.mid;
    audioState.value.isPlaying = true;
  }
}

function isCodeMessage(content: string): boolean {
  try {
    const parsed = parseMessageContent(content);
    return parsed.type === 'code';
  } catch (e) {
    return false;
  }
}

function formatCode(code: string, language: string): string {
  try {
    // First, replace any existing HTML entities with their actual characters
    const decodedCode = code
      .replace(/&quot;/g, '"')
      .replace(/&#034;/g, '"')  
      .replace(/&#039;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    
    // Then sanitize for HTML display (but don't escape quotes unnecessarily)
    const sanitizedCode = decodedCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(sanitizedCode, { language }).value;
    } else {
      return hljs.highlightAuto(sanitizedCode).value;
    }
  } catch (e) {
    console.error('Error highlighting code:', e);
    // Minimal sanitization for safety
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

function getCodeContent(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
    if (parsed.type === 'code' && parsed.content) {
      // Ensure all HTML entities are decoded for proper display of quotes and other characters
      return parsed.content
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#034;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    }
    return '';
  } catch (e) {
    return '';
  }
}

function getCodeLanguage(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
    return parsed.type === 'code' && parsed.language ? parsed.language : 'plaintext';
  } catch (e) {
    return 'plaintext';
  }
}

function getCodeName(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
    return parsed.type === 'code' && parsed.name ? parsed.name : 'code.txt';
  } catch (e) {
    return 'code.txt';
  }
}

function getCodeSize(message: IMessage): string {
  try {
    const parsed = parseMessageContent(message.content);
    if (parsed.type === 'code' && parsed.size) {
      return formatFileSize(parsed.size);
    }
    return '';
  } catch (e) {
    return '';
  }
}
</script>

<template>
  <div class="relative flex-1 overflow-y-auto p-4 bg-background/95 message-list-container custom-scrollbar"
    ref="messageListRef"
    style="background-image: url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4-1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4-1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E');">
    <div v-if="isViewingOlderMessages"
      class="fixed bg-zinc-900 text-white rounded-full px-4 py-2 z-20 flex items-center justify-between shadow-lg older-messages-notification"
      :style="{ opacity: notificationOpacity, bottom: '100px', left: '50%', transform: 'translateX(-50%)' }">
      <span class="text-sm">You're Viewing Older Messages</span>
      <button @click="scrollToLatest"
        class="ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3 py-1 text-xs flex items-center">
        <span>Jump To Present</span>
        <ArrowDown class="h-3 w-3 ml-1" />
      </button>
    </div>
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <div class="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
      <span class="ml-2">Loading messages...</span>
    </div>
    <div v-else-if="error" class="flex items-center justify-center h-full">
      <div class="bg-destructive/10 text-destructive p-4 rounded-md max-w-[80%] text-center">
        <p class="font-medium">Error loading messages</p>
        <p>{{ error }}</p>
      </div>
    </div>
    <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
      <div class="bg-card p-6 rounded-lg shadow-lg">
        <MessageSquare class="h-12 w-12 mx-auto text-muted-foreground" />
        <p class="mt-4 text-muted-foreground">No messages yet with {{ contactUsername }}</p>
        <p class="mt-2 text-sm text-muted-foreground">Send a message to start the conversation</p>
      </div>
    </div>
    <div v-else class="flex flex-col space-y-6">
      <div v-for="group in messageGroups" :key="group.dateValue">
        <div class="flex justify-center mb-4">
          <div class="bg-muted/70 text-muted-foreground text-xs px-4 py-1 rounded-full">
            {{ group.dateLabel }}
          </div>
        </div>
        <div class="flex flex-col space-y-4">
          <div v-for="(minuteGroup, groupIndex) in group.minuteGroups"
            :key="`${group.dateValue}-${minuteGroup.minute}-${groupIndex}`" class="flex flex-col" :class="{
              'items-end pr-2': minuteGroup.sender === currentUserId,
              'items-start pl-2': minuteGroup.sender !== currentUserId,
              'mb-1': true
            }">
            <div class="flex flex-col" style="max-width: 75%;">
              <div v-for="(message, messageIndex) in minuteGroup.messages" :key="message.mid" :class="[
                getEmojiMessageStyle(getMessageContent(message)) || 'px-3 py-2 shadow-sm inline-block',
                {
                  'bg-blue-600 text-white': message.sender_uid === currentUserId && !getEmojiMessageStyle(getMessageContent(message)),
                  'bg-zinc-800 text-white': message.sender_uid !== currentUserId && !getEmojiMessageStyle(getMessageContent(message)),
                  'mb-0.5': messageIndex < minuteGroup.messages.length - 1,
                  'self-end': message.sender_uid === currentUserId,
                  'self-start': message.sender_uid !== currentUserId,
                  'max-w-message': true
                },
                !getEmojiMessageStyle(getMessageContent(message)) ? [
                  getMessagePosition(message, minuteGroup) === 'single' ? 'message-bubble-rounded' : '',
                  getMessagePosition(message, minuteGroup) === 'first' && message.sender_uid === currentUserId ?
                    'message-bubble-rounded-top message-bubble-rounded-left message-bubble-bottom-left' : '',
                  getMessagePosition(message, minuteGroup) === 'first' && message.sender_uid !== currentUserId ?
                    'message-bubble-rounded-top message-bubble-rounded-right message-bubble-bottom-right' : '',
                  getMessagePosition(message, minuteGroup) === 'middle' && message.sender_uid === currentUserId ?
                    'message-bubble-rounded-left' : '',
                  getMessagePosition(message, minuteGroup) === 'middle' && message.sender_uid !== currentUserId ?
                    'message-bubble-rounded-right' : '',
                  getMessagePosition(message, minuteGroup) === 'last' && message.sender_uid === currentUserId ?
                    'message-bubble-rounded-bottom message-bubble-rounded-left message-bubble-top-left' : '',
                  getMessagePosition(message, minuteGroup) === 'last' && message.sender_uid !== currentUserId ?
                    'message-bubble-rounded-bottom message-bubble-rounded-right message-bubble-top-right' : ''
                ] : []
              ]">
                <div class="relative message-content">
                  <template
                    v-if="!isImageMessage(message.content) && !isDocumentMessage(message.content) && !isAudioMessage(message.content) && !isCodeMessage(message.content)">
                    <p :class="[
                      'message-text',
                      (getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') ? 'has-timestamp' : '',
                      getEmojiMessageStyle(getMessageContent(message))
                    ]">
                      {{ getMessageContent(message) }}
                    </p>
                  </template>
                  <div v-else-if="isImageMessage(message.content)" class="image-container"
                    :class="[(getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') ? 'has-timestamp' : '']">
                    <template v-if="getImageSource(message)"><div class="image-wrapper">
                        <img :src="getImageSource(message) || ''" alt="Image message" class="rounded-lg max-w-full"
                          style="max-height: 300px;" @click="emit('view-image', getImageSource(message))" />
                        <div class="image-info-overlay">
                          <div class="image-name font-medium truncate">
                            {{ getImageName(message) }}
                          </div>
                          <div class="image-size text-xs opacity-70">
                            {{ getImageSize(message) }}
                          </div>
                        </div>
                        <a :href="getImageSource(message) || undefined" :download="getImageName(message)"
                          class="image-download-button" title="Download image" @click.stop>
                          <Download class="h-5 w-5" />
                        </a>
                      </div>
                      <span
                        v-if="getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last'"
                        class="text-xs opacity-70 message-timestamp image-timestamp">
                        {{ formatTimeForMessage(message.timestamp) }}
                      </span>
                    </template>
                    <div v-else class="image-error p-2 text-destructive">
                      Image data could not be loaded
                    </div>
                  </div>
                  <div v-else-if="isDocumentMessage(message.content)" class="document-container"
                    :class="[(getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') ? 'has-timestamp' : '']">
                    <div class="document-preview">
                      <a :href="getFileSource(message)" :download="getDocumentName(message)"
                        class="flex items-start p-2 rounded-lg document-link">
                        <div class="document-icon mr-2">
                          <FileText class="h-8 w-8" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="document-name font-medium truncate">
                            {{ getDocumentName(message) }}
                          </div>
                          <div class="document-size text-xs opacity-70">
                            {{ getDocumentSize(message) }}
                          </div>
                        </div>
                        <div class="document-download ml-2 flex-shrink-0">
                          <Download class="h-5 w-5" />
                        </div>
                      </a>
                      <span
                        v-if="getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last'"
                        class="text-xs opacity-70 message-timestamp document-timestamp">
                        {{ formatTimeForMessage(message.timestamp) }}
                      </span>
                    </div>
                  </div>
                  <div v-else-if="isCodeMessage(message.content)" class="code-container"
                    :class="[(getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') ? 'has-timestamp' : '']">
                    <div class="code-preview">
                      <div class="code-header flex items-center justify-between p-2 bg-zinc-800 border-b border-zinc-700 rounded-t-lg">
                        <div class="flex items-center">
                          <Code class="h-5 w-5 mr-2 text-blue-400" />
                          <div class="code-name font-medium truncate">
                            {{ getCodeName(message) }}
                          </div>
                          <div class="code-size text-xs opacity-70 ml-2">
                            {{ getCodeSize(message) }}
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <button
                            class="code-expand-button"
                            title="Expand code"
                            @click.stop="emit('view-code', getCodeContent(message), getCodeLanguage(message), getCodeName(message))">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                            </svg>
                          </button>
                          <a :href="`data:text/plain;charset=utf-8,${encodeURIComponent(getCodeContent(message))}`" 
                             :download="getCodeName(message)"
                             class="code-download-button" 
                             title="Download code file" 
                             @click.stop>
                            <Download class="h-5 w-5" />
                          </a>
                        </div>
                      </div>
                      <div class="code-content p-0 overflow-x-auto">
                        <pre class="text-sm m-0 p-4 bg-zinc-900"><code v-html="formatCode(getCodeContent(message), getCodeLanguage(message))"></code></pre>
                      </div>
                      <span
                        v-if="getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last'"
                        class="text-xs opacity-70 message-timestamp code-timestamp">
                        {{ formatTimeForMessage(message.timestamp) }}
                      </span>
                    </div>
                  </div>
                  <div v-else-if="isAudioMessage(message.content)" class="audio-container"
                    :class="[(getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') ? 'has-timestamp' : '']">
                    <div class="audio-player p-3 pb-4">
                      <audio :src="getAudioSource(message) || ''" :data-message-id="message.mid" preload="metadata"
                        class="hidden" @timeupdate="handleTimeUpdate(message, $event)"
                        @loadedmetadata="handleAudioMetadata(message, $event)" @ended="handleAudioEnded(message)">
                      </audio>
                      <div class="custom-audio-player">
                        <button @click="toggleAudioPlayback(message)" class="audio-control-button flex-shrink-0"
                          :class="{ 'is-playing': audioState.messageId === message.mid && audioState.isPlaying }">
                          <Play v-if="audioState.messageId !== message.mid || !audioState.isPlaying" class="h-8 w-8" />
                          <Pause v-else class="h-8 w-8" />
                        </button>
                        <div class="audio-progress-container ml-2 flex-1">
                          <div class="audio-progress-bar-bg" @click="setAudioPosition($event, message)">
                            <div class="audio-progress-bar" :style="{
                              width: audioState.messageId === message.mid 
                                  ? `${(audioState.currentTime / audioState.duration) * 100}%` 
                                  : '0%' 
                              }"></div>
                          </div>
                          <div class="audio-time-display text-xs">
                            <span>{{
                              audioState.messageId === message.mid
                                ? formatAudioTime(audioState.currentTime)
                              : '0:00'
                              }}</span>
                            <span class="mx-1">/</span>
                            <span>{{
                              audioState.messageId === message.mid && audioState.duration
                              ? formatAudioTime(audioState.duration)
                              : '0:00'
                              }}</span>
                          </div>
                        </div>
                        <a :href="getAudioSource(message) || ''"
                          :download="`audio-${message.mid}.${getAudioExtension(message)}`"
                          class="audio-download-button ml-2" title="Download audio" @click.stop>
                          <Download class="h-5 w-5" />
                        </a>
                      </div>
                      <span
                        v-if="getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last'"
                        class="text-xs opacity-70 message-timestamp document-timestamp">
                        {{ formatTimeForMessage(message.timestamp) }}
                      </span>
                    </div>
                  </div>
                  <span
                    v-if="(getMessagePosition(message, minuteGroup) === 'single' || getMessagePosition(message, minuteGroup) === 'last') && !isImageMessage(message.content) && !isDocumentMessage(message.content) && !isAudioMessage(message.content) && !isCodeMessage(message.content)"
                    class="text-xs opacity-70 message-timestamp"
                    :class="{ 'emoji-timestamp': getEmojiMessageStyle(getMessageContent(message)) }">
                    {{ formatTimeForMessage(message.timestamp) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(128, 128, 128, 0.4);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(128, 128, 128, 0.6);
}

.custom-scrollbar::-webkit-scrollbar-button {
  display: none;
  height: 0;
  width: 0;
}

.custom-scrollbar::-webkit-scrollbar-button:start:decrement,
.custom-scrollbar::-webkit-scrollbar-button:end:increment {
  display: none;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
}

.custom-scrollbar * {
  -ms-overflow-style: none;
  scrollbar-width: thin;
}

.message-bubble-rounded {
  border-radius: 18px;
}

.message-bubble-rounded-left {
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
}

.message-bubble-rounded-right {
  border-top-right-radius: 18px;
  border-bottom-right-radius: 18px;
}

.message-bubble-rounded-top {
  border-top-left-radius: 18px;
  border-top-right-radius: 18px;
}

.message-bubble-rounded-bottom {
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 18px;
}

.message-bubble-top-left {
  border-top-left-radius: 18px;
}

.message-bubble-top-right {
  border-top-right-radius: 18px;
}

.message-bubble-bottom-left {
  border-bottom-left-radius: 18px;
}

.message-bubble-bottom-right {
  border-bottom-right-radius: 18px;
}

.message-content {
  min-width: 14px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  padding: 0;
}

.message-text.has-timestamp::after {
  content: '';
  display: inline-block;
  width: 40px;
}

.emoji-only .message-text.has-timestamp::after {
  width: 0;
  display: none;
}

.message-timestamp {
  position: absolute;
  right: 3px;
  bottom: 0;
  margin: 0;
  padding: 0;
  font-size: 0.65rem;
  white-space: nowrap;
}

.max-w-message {
  max-width: 100%;
}

.emoji-only {
  background: transparent !important;
  box-shadow: none !important;
  padding: 2px !important;
}

.emoji-single {
  font-size: 4rem !important;
  line-height: 1.2;
  padding: 0.2rem !important;
}

.emoji-few {
  font-size: 3rem !important;
  line-height: 1.2;
  padding: 0.2rem !important;
}

.emoji-several {
  font-size: 2rem !important;
  line-height: 1.3;
  padding: 0.2rem !important;
}

.emoji-timestamp {
  position: absolute;
  color: rgba(155, 155, 155, 0.8) !important;
  bottom: -1.5em !important;
  right: 3px !important;
  font-size: 0.65rem;
}

.image-container {
  cursor: pointer;
  transition: transform 0.2s;
  margin: 2px 0;
  position: relative;
  padding-bottom: 18px;
}

.image-container img {
  border-radius: 12px;
}

.image-container:hover {
  transform: scale(1.02);
}

.image-timestamp {
  color: rgba(255, 255, 255, 0.9) !important;
  bottom: 4px !important;
  right: 6px !important;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 2px 5px;
  border-radius: 10px;
  font-size: 0.65rem;
}

.image-error {
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  font-size: 0.85rem;
}

.image-wrapper {
  position: relative;
  overflow: hidden;
}

.image-info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.image-wrapper:hover .image-info-overlay {
  opacity: 1;
}

.image-download-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  cursor: pointer;
}

.image-wrapper:hover .image-download-button {
  opacity: 0.8;
}

.image-download-button:hover {
  opacity: 1 !important;
  transform: scale(1.1);
  background-color: rgba(0, 0, 0, 0.8);
}

.image-name {
  color: white;
  max-width: 200px;
}

.older-messages-notification {
  animation: fadeIn 0.3s ease-in-out;
  transition: all 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.document-container {
  margin: 2px 0;
  position: relative;
  padding-bottom: 18px;
}

.document-preview {
  position: relative;
}

.document-link {
  text-decoration: none;
  color: inherit;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
  min-width: 200px;
}

.document-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.document-name {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.document-size {
  color: rgba(155, 155, 155, 0.8);
}

.document-icon.pdf svg {
  color: #e53935;
}

.document-icon.doc svg {
  color: #1565c0;
}

.document-icon.sheet svg {
  color: #2e7d32;
}

.document-icon.presentation svg {
  color: #ff8f00;
}

.document-icon.text svg {
  color: #78909c;
}

.document-icon.zip svg {
  color: #7b1fa2;
}

.document-timestamp {
  position: absolute;
  color: rgba(255, 255, 255, 0.9);
  bottom: -16px;
  right: 6px;
  font-size: 0.65rem;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 2px 5px;
  border-radius: 10px;
}

.audio-container {
  margin: 2px 0;
  position: relative;
  padding-bottom: 16px;
}

.audio-player {
  position: relative;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: visible;
}

.custom-audio-player {
  display: flex;
  align-items: center;
  padding: 4px;
  width: 100%;
  min-width: 200px;
}

.audio-control-button {
  display: flex;
  justify-content: center;
  align-items: center;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.audio-control-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.audio-control-button.is-playing {
  color: #3b82f6;
}

.audio-download-button {
  display: flex;
  justify-content: center;
  align-items: center;
  color: inherit;opacity: 0.7;
  transition: all 0.2s ease;
  padding: 4px;
  border-radius: 50%;
}

.audio-download-button:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.15);
  transform: scale(1.1);
}

.audio-progress-container {
  display: flex;
  flex-direction: column;
}

.audio-progress-bar-bg {
  position: relative;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin-bottom: 6px;
  cursor: pointer;
}

.audio-progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: #3b82f6; /* blue-500 */
  border-radius: 2px;
  transition: width 0.1s linear;
}

.audio-time-display {
  display: flex;
  color: rgba(255, 255, 255, 0.7);
}

.audio-player .document-timestamp {
  bottom: -12px;
}

.code-container {
  margin: 2px 0;
  position: relative;
  padding-bottom: 24px;
  width: 100%;
}

.code-preview {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.code-header {
  padding: 8px 12px;
  background-color: #1f2937;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.code-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.code-size {
  color: rgba(155, 155, 155, 0.8);
  margin-left: 8px;
  font-size: 0.75rem;
}

.code-content {
  max-height: 300px;
  position: relative;
}

.code-content pre {
  margin: 0;
  padding: 1rem;
}

.code-download-button {
  background-color: rgba(255, 255, 255, 0.1);
  color: inherit;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  cursor: pointer;
}

.code-download-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.code-timestamp {
  position: absolute;
  color: rgba(255, 255, 255, 0.9);
  bottom: -16px;
  right: 6px;
  font-size: 0.65rem;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 2px 5px;
  border-radius: 10px;
}

.hljs-comment {
  color: #8b949e;
  font-style: italic;
}

.hljs-keyword {
  color: #ff7b72;
  font-weight: bold;
}

.hljs-string {
  color: #a5d6ff;
}

.hljs-number {
  color: #79c0ff;
}

.hljs-function {
  color: #d2a8ff;
}

.hljs-title {
  color: #79c0ff;
}

.hljs-params {
  color: #c9d1d9;
}

.hljs-built_in {
  color: #ffa657;
}

.code-container .code-expand-button,
.code-container .code-download-button {
  padding: 0.25rem;
  border-radius: 0.375rem;
  color: rgba(255, 255, 255, 0.8);
  transition-property: color, background-color;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.code-container .code-expand-button:hover,
.code-container .code-download-button:hover {
  color: rgba(255, 255, 255, 1);
  background-color: rgba(63, 63, 70, 1);
}

.code-container .code-expand-button svg {
  stroke: currentColor;
}

.code-content {
  max-height: 300px;
  position: relative;
}
</style>
